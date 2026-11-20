# D:/SWP391/SWP391/ai_service/tests/test_dietary_contract.py
# Kiểm thử hợp đồng 7 chế độ ăn xuyên suốt các API (chat, thực đơn, quét món):
# nhận diện chế độ, hậu kiểm nguyên liệu vi phạm và quy tắc riêng của keto/eat clean/chay Phật giáo.
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from agents.chatbot_agent import ChatbotAgent
from agents.food_scanner_agent import _scan_messages
from agents.meal_planner_agent import GeneratedMealPlan, MealPlannerAgent, validate_plan
from api.chat import ChatRequest
from api.meal_planner import MealPlanRequest
from core.nutrition import diet_key, find_diet_violations
from schemas.food_scanner import FoodScanRequest
from tests.test_food_scanner import IMAGE_BASE64
from tests.test_meal_planner_agent import PROFILE, TARGETS, make_plan

# Danh sách mã chế độ ăn phải khớp với dữ liệu phía Back-end.
DIETS = ["vegan", "lacto", "ovo", "lacto_ovo", "buddhist", "keto", "eat_clean"]


# Mỗi chế độ ăn đi qua request model của chat và thực đơn mà giữ nguyên mã.
@pytest.mark.parametrize("diet", DIETS)
def test_seven_diets_round_trip_request_models(diet: str) -> None:
    assert (
        ChatRequest(message="Gợi ý món ăn", dietaryType=diet).model_dump(by_alias=True)[
            "dietaryType"
        ]
        == diet
    )
    assert (
        MealPlanRequest(heightCm=165, weightKg=60, dietaryType=diet).dietary_type
        == diet
    )
    assert diet_key(diet) == diet


# Mã chế độ ăn không nằm trong danh sách -> lỗi validate.
@pytest.mark.parametrize(
    "model,fields",
    [
        (ChatRequest, {"message": "Gợi ý món ăn"}),
        (MealPlanRequest, {"heightCm": 165, "weightKg": 60}),
    ],
)
def test_request_rejects_unknown_diet(model: type, fields: dict) -> None:
    with pytest.raises(ValidationError):
        model(**fields, dietaryType="arbitrary")


# Chay Phật giáo: hậu kiểm phải bắt được ngũ vị tân (hành, tỏi, hẹ, kiệu, nén) và sản phẩm động vật.
@pytest.mark.parametrize(
    "ingredient",
    [
        "Hành lá",
        "Tỏi",
        "Hẹ",
        "Kiệu",
        "Nén",
        "Garlic",
        "Onion",
        "Sữa bò",
        "Trứng",
        "Mật ong",
    ],
)
def test_buddhist_postvalidation_excludes_alliums_and_animal_products(
    ingredient: str,
) -> None:
    assert find_diet_violations([("Trưa", "Rau trộn", [ingredient])], "buddhist")


# Tránh bắt nhầm: 'Hạnh nhân' không bị coi là 'hành'; chế độ thuần chay vẫn cho phép tỏi.
def test_buddhist_matching_preserves_plant_names_and_other_diets_allow_alliums() -> (
    None
):
    assert not find_diet_violations(
        [("Trưa", "Rau trộn", ["Hạnh nhân", "Sữa hạnh nhân"])], "buddhist"
    )
    assert not find_diet_violations([("Trưa", "Rau trộn", ["Tỏi"])], "vegan")


# Eat clean: hậu kiểm phát hiện nguyên liệu tinh luyện ghi rõ (đường/dầu tinh luyện).
@pytest.mark.parametrize(
    "ingredient",
    [
        "Đường tinh luyện",
        "Đường trắng",
        "Dầu tinh luyện",
        "Refined sugar",
        "Refined oil",
    ],
)
def test_eat_clean_postvalidation_detects_explicit_refined_ingredients(
    ingredient: str,
) -> None:
    assert find_diet_violations([("Trưa", "Rau trộn", [ingredient])], "eat_clean")


# Eat clean chấp nhận thực phẩm nguyên chất và dầu olive.
def test_eat_clean_accepts_whole_plant_foods_and_olive_oil() -> None:
    assert not find_diet_violations(
        [("Trưa", "Rau trộn", ["Đậu phụ", "Gạo lứt", "Dầu olive"])], "eat_clean"
    )


# Nhãn 'chay' không được miễn trừ cho nguyên liệu tinh luyện.
def test_refined_foods_are_not_exempted_by_plant_based_labels() -> None:
    assert find_diet_violations(
        [("Trưa", "Rau trộn", ["Đường tinh luyện chay"])], "eat_clean"
    )


# Prompt quét ảnh phải chứa quy tắc đúng với chế độ ăn được chọn (dietTypeId 1-7).
@pytest.mark.parametrize(
    "diet_id,required",
    [
        (1, "Thuần chay"),
        (2, "Chay có sữa"),
        (3, "Chay có trứng"),
        (4, "Chay có trứng và sữa"),
        (5, "ngũ vị tân"),
        (6, "carb thuần"),
        (7, "toàn phần"),
    ],
)
def test_image_scan_receives_rules_for_the_selected_diet(
    diet_id: int, required: str
) -> None:
    request = FoodScanRequest(
        imageBase64=IMAGE_BASE64, mimeType="image/png", dietTypeId=diet_id
    )
    messages = _scan_messages(request)
    assert required in messages[1].content[0]["text"]


# Keto: một ảnh không thể xác minh carb thuần cả ngày, nên kết quả phải hạ xuống 'warning'
# thay vì 'clear' dù provider trả về không có vấn đề.
def test_keto_scan_never_claims_daily_net_carbs_verified_from_one_image(
    client: TestClient, internal_headers: dict[str, str]
) -> None:
    provider_result = {
        "dishName": "Rau trộn",
        "detectedScanType": "DISH",
        "status": "clear",
        "summary": "Nhận diện rau và nấm.",
        "findings": [],
        "identifiedIngredients": ["Rau", "Nấm"],
        "restaurantChecklist": [],
        "swapSuggestions": [],
    }
    provider = SimpleNamespace(
        ainvoke=AsyncMock(
            return_value=SimpleNamespace(content=json.dumps(provider_result))
        )
    )
    with patch("agents.food_scanner_agent.get_llm_json", return_value=provider):
        response = client.post(
            "/api/food-scanner/analyze",
            headers=internal_headers,
            json={
                "imageBase64": IMAGE_BASE64,
                "mimeType": "image/png",
                "dietTypeId": 6,
            },
        )
    assert response.status_code == 200
    result = response.json()["data"]
    assert result["status"] == "warning"
    assert "chưa thể xác minh" in result["summary"]


# Prompt chat và prompt lập thực đơn phải chứa quy tắc thực tế của chế độ ăn, không chỉ tên chế độ.
@pytest.mark.parametrize(
    "diet,required",
    [
        ("buddhist", ["ngũ vị tân", "nén"]),
        ("keto", ["50", "carb thuần", "fiberG"]),
        ("eat_clean", ["toàn phần", "tinh luyện"]),
    ],
)
def test_chat_and_meal_prompts_supply_actual_diet_rules(
    diet: str, required: list[str]
) -> None:
    chat = ChatbotAgent().load_prompt(diet)
    meal = MealPlannerAgent._build_user_prompt(
        TARGETS, 165, 55, 25, "female", "maintenance", diet, [], [], 1
    )
    for phrase in required:
        assert phrase in chat
        assert phrase in meal


# Tạo thực đơn 1 ngày với lượng carb (và chất xơ nếu có) như nhau cho mọi bữa, kể cả bữa phụ.
def keto_plan(carbs: float, fiber: float | None) -> GeneratedMealPlan:
    plan = make_plan(1)
    for meal in [
        plan.weekly_plan[0].breakfast,
        plan.weekly_plan[0].lunch,
        plan.weekly_plan[0].dinner,
        plan.weekly_plan[0].snacks,
    ]:
        meal.carbs_g = carbs
        if fiber is not None:
            meal.fiber_g = fiber
    return plan


# Keto thiếu dữ liệu chất xơ -> lỗi cứng, vì không thể tính carb thuần.
def test_keto_requires_fiber_instead_of_claiming_net_carbs_verified() -> None:
    hard, _ = validate_plan(keto_plan(10, None), TARGETS, 1, [], dietary_type="keto")
    assert any("chất xơ" in error for error in hard)


# Carb thuần tính từ từng bữa (kể cả bữa phụ), không tin daily_carbs_g do LLM tự khai.
def test_keto_enforces_net_carbs_from_meals_and_includes_snacks() -> None:
    accepted = keto_plan(20, 8)
    assert validate_plan(accepted, TARGETS, 1, [], dietary_type="keto")[0] == []
    rejected = keto_plan(20, 7.5)
    rejected.weekly_plan[0].daily_carbs_g = 1
    hard, _ = validate_plan(rejected, TARGETS, 1, [], dietary_type="keto")
    assert any("50" in error and "carb thuần" in error for error in hard)


# Chất xơ lớn hơn tổng carb là phi lý -> bị từ chối.
def test_keto_rejects_impossible_fiber_values() -> None:
    hard, _ = validate_plan(keto_plan(20, 21), TARGETS, 1, [], dietary_type="keto")
    assert hard


# Thực đơn sinh ra luôn giữ chế độ ăn người dùng yêu cầu, kể cả khi provider ghi nhãn sai.
@pytest.mark.asyncio
async def test_generated_plan_preserves_requested_identity_despite_wrong_provider_label() -> (
    None
):
    provider = AsyncMock()
    provider.ainvoke.return_value = make_plan(1)
    with patch("agents.meal_planner_agent.get_structured_llm", return_value=provider):
        plan = await MealPlannerAgent().generate_plan(
            days=1, dietary_type="buddhist", **PROFILE
        )
    assert plan.profile_summary.dietary_type == "buddhist"
