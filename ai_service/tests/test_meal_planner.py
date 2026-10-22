# D:/SWP391/SWP391/ai_service/tests/test_meal_planner.py
# ai_service/tests/test_meal_planner.py
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from agents.meal_planner_agent import (
    DailyMealPlan,
    GeneratedMealPlan,
    MealItem,
    MealPlanProfile,
    meal_planner_agent,
)
from core.config import settings
from main import app

client = TestClient(app)
INTERNAL_HEADERS = {"X-Internal-Api-Key": settings.INTERNAL_API_KEY}


def sample_meal_plan():
    return GeneratedMealPlan(
        title="Thực đơn chay mẫu (1 ngày) tăng cơ giảm mỡ",
        summary="Thực đơn giàu đạm thực vật từ đậu nành và các loại hạt.",
        profile_summary=MealPlanProfile(
            bmi=22.5,
            bmi_category="Bình thường (Normal weight)",
            target_daily_calories=2000,
            primary_goal="muscle_gain",
            dietary_type="vegan",
            used_available_ingredients=["đậu phụ", "nấm hương"],
        ),
        weekly_plan=[
            DailyMealPlan(
                day="Thứ Hai",
                day_number=1,
                breakfast=MealItem(
                    name="Cháo yến mạch hạt chia sữa đậu nành",
                    ingredients=["Yến mạch 50g", "Hạt chia 10g", "Sữa đậu 200ml"],
                    instructions="Nấu chín yến mạch trong sữa đậu nành và rắc hạt chia",
                    estimated_calories=350,
                    protein_g=15.0,
                    carbs_g=50.0,
                    fat_g=7.0,
                ),
                lunch=MealItem(
                    name="Đậu phụ sốt cà chua nấm hương và cơm gạo lứt",
                    ingredients=["Đậu phụ 150g", "Nấm hương 50g", "Gạo lứt 1 chén"],
                    instructions="Áp chảo đậu phụ, xào sốt cà chua nấm hương và ăn kèm cơm gạo lứt",
                    estimated_calories=600,
                    protein_g=25.0,
                    carbs_g=65.0,
                    fat_g=12.0,
                ),
                dinner=MealItem(
                    name="Canh rong biển đậu hũ non và salad rau mầm",
                    ingredients=["Đậu hũ non 100g", "Rong biển 20g", "Rau xà lách 100g"],
                    instructions="Nấu canh thanh đạm và trộn salad mè rang",
                    estimated_calories=400,
                    protein_g=18.0,
                    carbs_g=40.0,
                    fat_g=10.0,
                ),
                snacks=MealItem(
                    name="Sinh tố chuối bơ đậu phộng hạt gai dầu",
                    ingredients=["Chuối 1 quả", "Bơ đậu phộng 15g"],
                    instructions="Xay nhuyễn cùng đá",
                    estimated_calories=200,
                    protein_g=8.0,
                    carbs_g=28.0,
                    fat_g=6.0,
                ),
                daily_calories=1500,
                daily_protein_g=66.0,
                daily_carbs_g=183.0,
                daily_fat_g=35.0,
            )
        ],
        grocery_shopping_list=["Yến mạch", "Hạt chia", "Rong biển khô"],
        nutritionist_tips=["Uống ít nhất 2 lít nước mỗi ngày", "Bổ sung B12 định kỳ"],
    )


def test_meal_planner_rejects_missing_internal_key():
    """Từ chối request nếu thiếu header X-Internal-Api-Key."""
    res = client.post("/api/meal-planner/generate", json={"heightCm": 170, "weightKg": 65})
    assert res.status_code == 401
    assert res.json()["errorCode"] == "UNAUTHORIZED_INTERNAL"


def test_calculate_bmi_info():
    """Kiểm tra logic tính BMI chuẩn Châu Á trong meal planner agent."""
    bmi, category = meal_planner_agent.calculate_bmi_info(height_cm=170, weight_kg=65)
    assert bmi == 22.5
    assert "Bình thường" in category

    _bmi_low, cat_low = meal_planner_agent.calculate_bmi_info(height_cm=170, weight_kg=50)
    assert "Thiếu cân" in cat_low

    _bmi_high, cat_high = meal_planner_agent.calculate_bmi_info(height_cm=170, weight_kg=80)
    assert "Béo phì" in cat_high or "Thừa cân" in cat_high


def test_meal_planner_validation_error():
    """Kiểm tra validation khi chiều cao hoặc cân nặng ngoài phạm vi hợp lệ."""
    res = client.post(
        "/api/meal-planner/generate",
        json={"heightCm": 10, "weightKg": 60},
        headers=INTERNAL_HEADERS,
    )
    assert res.status_code == 422
    assert res.json()["errorCode"] == "INVALID_INPUT"


@patch("api.meal_planner.meal_planner_agent.generate_plan", new_callable=AsyncMock)
def test_generate_meal_plan_success(mock_generate):
    """Tạo thực đơn thành công kèm chat bubble."""
    mock_generate.return_value = sample_meal_plan()

    payload = {
        "heightCm": 170,
        "weightKg": 65,
        "age": 26,
        "gender": "male",
        "goal": "muscle_gain",
        "activityLevel": "moderate",
        "dietaryType": "vegan",
        "allergies": ["peanuts"],
        "availableIngredients": ["đậu phụ", "nấm hương"],
        "days": 1,
    }

    res = client.post(
        "/api/meal-planner/generate",
        json=payload,
        headers=INTERNAL_HEADERS,
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["title"] == "Thực đơn chay mẫu (1 ngày) tăng cơ giảm mỡ"
    assert len(data["weeklyPlan"]) == 1
    assert "chat" in data
    assert "title" in data["chat"]
    assert "text" in data["chat"]


@patch("api.meal_planner.meal_planner_agent.generate_plan", new_callable=AsyncMock)
def test_generate_meal_plan_llm_failure_returns_502(mock_generate):
    """Khi AI provider gặp sự cố -> Trả về lỗi 502 AI_PROVIDER_ERROR."""
    mock_generate.side_effect = Exception("LLM connection timed out")

    res = client.post(
        "/api/meal-planner/generate",
        json={"heightCm": 170, "weightKg": 65},
        headers=INTERNAL_HEADERS,
    )
    assert res.status_code == 502
    assert res.json()["errorCode"] == "AI_PROVIDER_ERROR"
