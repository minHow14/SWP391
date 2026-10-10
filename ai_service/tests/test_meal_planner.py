import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from main import app
from core.security import reset_guest_usage_for_tests
from agents.meal_planner_agent import (
    GeneratedMealPlan,
    MealPlanProfile,
    DailyMealPlan,
    MealItem,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_usage():
    reset_guest_usage_for_tests()
    yield
    reset_guest_usage_for_tests()


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
                    ingredients=["Đậu phụ 150g", "Nấm hương 50g", "Cà chua 1 quả", "Cơm gạo lứt 150g"],
                    instructions="Đậu phụ áp chảo xào nấm sốt cà chua",
                    estimated_calories=550,
                    protein_g=25.0,
                    carbs_g=65.0,
                    fat_g=12.0,
                ),
                dinner=MealItem(
                    name="Canh rong biển đậu hũ non và salad hạt",
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


def test_calculate_bmi_info():
    from agents.meal_planner_agent import meal_planner_agent

    bmi, category = meal_planner_agent.calculate_bmi_info(height_cm=170, weight_kg=65)
    assert bmi == 22.5
    assert "Bình thường" in category

    bmi_low, cat_low = meal_planner_agent.calculate_bmi_info(height_cm=170, weight_kg=50)
    assert "Thiếu cân" in cat_low

    bmi_high, cat_high = meal_planner_agent.calculate_bmi_info(height_cm=170, weight_kg=80)
    assert "Béo phì" in cat_high or "Thừa cân" in cat_high


def test_meal_planner_validation():
    # Height or weight out of range
    res = client.post("/api/meal-planner/generate", json={"height_cm": 10, "weight_kg": 60})
    assert res.status_code == 422
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_INPUT"
    assert "meta" in data and "requestId" in data["meta"]


def test_guest_meal_plan_usage_initial():
    res = client.get("/api/meal-planner/usage", headers={"X-Guest-Id": "guest-mp-1"})
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["is_authenticated"] is False
    assert data["daily_limit"] == 3
    assert data["used_plans"] == 0
    assert data["remaining_plans"] == 3
    assert data["unlimited"] is False
    assert "meta" in res.json() and "requestId" in res.json()["meta"]


def test_authenticated_user_meal_plan_usage():
    res = client.get("/api/meal-planner/usage", headers={"X-User-Id": "user-mp-100"})
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["is_authenticated"] is True
    assert data["unlimited"] is True
    assert data["remaining_plans"] is None
    assert "meta" in res.json() and "requestId" in res.json()["meta"]


@patch("api.meal_planner.meal_planner_agent.generate_plan")
def test_generate_meal_plan_guest_rate_limiting(mock_generate):
    mock_generate.return_value = sample_meal_plan()
    headers = {"X-Guest-Id": "guest-mp-limit"}

    payload = {
        "height_cm": 170,
        "weight_kg": 65,
        "age": 25,
        "goal": "maintenance",
        "dietary_type": "vegan",
        "days": 7,
    }

    # 1. First 3 generations succeed
    for i in range(3):
        res = client.post("/api/meal-planner/generate", json=payload, headers=headers)
        assert res.status_code == 200
        assert res.json()["success"] is True

    # Check usage endpoint reflects 3 used, 0 remaining
    res_usage = client.get("/api/meal-planner/usage", headers=headers)
    assert res_usage.json()["data"]["used_plans"] == 3
    assert res_usage.json()["data"]["remaining_plans"] == 0

    # 2. 4th generation hits rate limit (HTTP 429)
    res_4th = client.post("/api/meal-planner/generate", json=payload, headers=headers)
    assert res_4th.status_code == 429
    data_4th = res_4th.json()
    assert data_4th["success"] is False
    assert data_4th["error"]["code"] == "MEAL_PLAN_QUOTA_EXCEEDED"
    assert "details" in data_4th["error"] and "resetAt" in data_4th["error"]["details"]
    assert "meta" in data_4th and "requestId" in data_4th["meta"]


@patch("api.meal_planner.meal_planner_agent.generate_plan")
def test_generate_meal_plan_ai_provider_error(mock_generate):
    mock_generate.side_effect = Exception("LLM upstream error")
    payload = {
        "height_cm": 170,
        "weight_kg": 65,
    }
    res = client.post("/api/meal-planner/generate", json=payload, headers={"X-User-Id": "user-err-1"})
    assert res.status_code == 502
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "AI_PROVIDER_ERROR"
    assert "meta" in data and "requestId" in data["meta"]


@patch("api.meal_planner.meal_planner_agent.generate_plan")
def test_generate_meal_plan_user_unlimited(mock_generate):
    mock_generate.return_value = sample_meal_plan()
    headers = {"X-User-Id": "user-vip-1"}

    payload = {
        "height_cm": 175,
        "weight_kg": 70,
        "age": 28,
        "goal": "weight_loss",
        "dietary_type": "lacto_ovo",
        "days": 7,
    }

    # User can generate multiple times without 429
    for _ in range(3):
        res = client.post("/api/meal-planner/generate", json=payload, headers=headers)
        assert res.status_code == 200
        assert res.json()["success"] is True


@patch("api.meal_planner.meal_planner_agent.generate_plan")
def test_generate_passes_bmi_and_activity_level_to_agent(mock_generate):
    mock_generate.return_value = sample_meal_plan()
    payload = {
        "height_cm": 170,
        "weight_kg": 65,
        "bmi": 22.5,
        "activity_level": "moderate",
        "allergies": ["soy"],
    }
    res = client.post("/api/meal-planner/generate", json=payload, headers={"X-User-Id": "user-bmi-1"})
    assert res.status_code == 200
    kwargs = mock_generate.call_args.kwargs
    assert kwargs["bmi"] == 22.5
    assert kwargs["activity_level"] == "moderate"
    assert kwargs["allergies"] == ["soy"]


def test_generate_rejects_invalid_activity_level_and_bmi():
    base = {"height_cm": 170, "weight_kg": 65}
    assert client.post("/api/meal-planner/generate", json={**base, "activity_level": "extreme"}).status_code == 422
    assert client.post("/api/meal-planner/generate", json={**base, "bmi": 2}).status_code == 422


@patch("api.chat.chatbot_agent.answer", new_callable=AsyncMock)
@patch("api.meal_planner.meal_planner_agent.generate_plan")
def test_guest_quota_shared_between_chat_and_meal_plan(mock_generate, mock_answer):
    mock_generate.return_value = sample_meal_plan()
    mock_answer.return_value = "ok"
    headers = {"X-Guest-Id": "shared-quota-guest"}
    payload = {"height_cm": 170, "weight_kg": 65}

    # Turn 1: chat, turn 2: meal plan, turn 3: chat
    assert client.post("/api/chat", json={"message": "Q1"}, headers=headers).status_code == 200
    assert client.post("/api/meal-planner/generate", json=payload, headers=headers).status_code == 200
    assert client.post("/api/chat", json={"message": "Q3"}, headers=headers).status_code == 200

    # Both usage endpoints read the same counter and nothing is left
    chat_usage = client.get("/api/chat/usage", headers=headers).json()["data"]
    plan_usage = client.get("/api/meal-planner/usage", headers=headers).json()["data"]
    assert chat_usage["used_questions"] == 3 and chat_usage["remaining_questions"] == 0
    assert plan_usage["used_plans"] == 3 and plan_usage["remaining_plans"] == 0

    # 4th turn is blocked for both features
    assert client.post("/api/chat", json={"message": "Q4"}, headers=headers).status_code == 429
    assert client.post("/api/meal-planner/generate", json=payload, headers=headers).status_code == 429


@patch("api.meal_planner.meal_planner_agent.generate_plan")
def test_meal_plan_quota_refunded_when_ai_fails(mock_generate):
    mock_generate.side_effect = Exception("LLM upstream error")
    headers = {"X-Guest-Id": "refund-plan-guest"}
    res = client.post("/api/meal-planner/generate", json={"height_cm": 170, "weight_kg": 65}, headers=headers)
    assert res.status_code == 502
    usage = client.get("/api/meal-planner/usage", headers=headers).json()["data"]
    assert usage["used_plans"] == 0
