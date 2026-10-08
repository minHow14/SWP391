import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from main import app
from agents.meal_planner_agent import (
    GeneratedMealPlan,
    MealPlanProfile,
    DailyMealPlan,
    MealItem,
)

client = TestClient(app)


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


@patch("agents.meal_planner_agent.meal_planner_agent.generate_plan")
def test_generate_meal_plan_success(mock_generate):
    # Mocking agent generate_plan response
    mock_plan = GeneratedMealPlan(
        title="Thực đơn chay 7 ngày tăng cơ giảm mỡ",
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

    mock_generate.return_value = mock_plan

    payload = {
        "height_cm": 170,
        "weight_kg": 65,
        "age": 24,
        "gender": "male",
        "goal": "muscle_gain",
        "dietary_type": "vegan",
        "allergies": ["gluten"],
        "available_ingredients": ["đậu phụ", "nấm hương"],
        "days": 7,
    }

    res = client.post("/api/meal-planner/generate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["title"] == "Thực đơn chay 7 ngày tăng cơ giảm mỡ"
    assert data["data"]["profile_summary"]["bmi"] == 22.5
    assert len(data["data"]["weekly_plan"]) == 1
    assert data["data"]["weekly_plan"][0]["breakfast"]["name"] == "Cháo yến mạch hạt chia sữa đậu nành"
