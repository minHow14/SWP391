import copy
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from agents.meal_planner_agent import (
    DailyMealPlan,
    GeneratedMealPlan,
    MealItem,
    MealPlanProfile,
    MealPlannerAgent,
    validate_plan,
)
from core.nutrition import calculate_targets

PROFILE = dict(height_cm=165, weight_kg=55, age=25, gender="female", goal="maintenance", activity_level="light")
TARGETS = calculate_targets(**PROFILE)
DAY_NAMES = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"]


def make_meal(name, kcal, protein, ingredients=None):
    return MealItem(
        name=name,
        ingredients=ingredients or ["Gạo lứt 100g", "Rau củ 150g"],
        estimated_calories=kcal,
        protein_g=protein,
        carbs_g=40.0,
        fat_g=10.0,
    )


def make_plan(days=7, kcal=None, protein=None, lunch_name="Cơm gạo lứt rau củ", lunch_ingredients=None):
    """Thực đơn mẫu có tổng calo/protein mỗi ngày bám theo mục tiêu (mặc định đạt)."""
    kcal = kcal or TARGETS.target_calories
    protein = protein or TARGETS.protein_g
    weekly = []
    for i in range(days):
        weekly.append(
            DailyMealPlan(
                day=DAY_NAMES[i],
                day_number=i + 1,
                breakfast=make_meal("Cháo yến mạch", round(kcal * 0.25), protein * 0.25),
                lunch=make_meal(lunch_name, round(kcal * 0.35), protein * 0.35, lunch_ingredients),
                dinner=make_meal("Canh rau củ", round(kcal * 0.30), protein * 0.30),
                snacks=make_meal("Trái cây", kcal - round(kcal * 0.25) - round(kcal * 0.35) - round(kcal * 0.30), protein * 0.10),
                daily_calories=kcal,
                daily_protein_g=protein,
                daily_carbs_g=200.0,
                daily_fat_g=50.0,
            )
        )
    return GeneratedMealPlan(
        title="Thực đơn thử",
        summary="Tóm tắt",
        profile_summary=MealPlanProfile(
            bmi=99.9,
            bmi_category="LLM tự điền sai",
            target_daily_calories=1,
            primary_goal="maintenance",
            dietary_type="vegan",
            used_available_ingredients=[],
        ),
        weekly_plan=weekly,
        grocery_shopping_list=["Gạo lứt"],
        nutritionist_tips=["Uống đủ nước"],
    )


def mock_llm(results):
    """Trả về (patcher, structured_mock): mỗi lần ainvoke trả/ném lần lượt phần tử trong results."""
    structured = AsyncMock()
    structured.ainvoke.side_effect = results
    llm = MagicMock()
    llm.with_structured_output.return_value = structured
    return patch("agents.meal_planner_agent.get_llm_json", return_value=llm), structured


async def run_agent(results, days=7, allergies=None, **extra):
    patcher, structured = mock_llm(results)
    with patcher:
        plan = await MealPlannerAgent().generate_plan(days=days, allergies=allergies, **PROFILE, **extra)
    return plan, structured


def test_validate_plan_accepts_matching_plan():
    hard, soft = validate_plan(make_plan(7), TARGETS, 7, [])
    assert hard == [] and soft == []


def test_validate_plan_flags_wrong_day_count_and_allergen():
    plan = make_plan(3, lunch_name="Đậu phụ sốt cà", lunch_ingredients=["Đậu phụ 150g"])
    hard, soft = validate_plan(plan, TARGETS, 7, ["soy"])
    assert any("đúng 7 ngày" in h for h in hard)
    assert any("dị ứng 'soy'" in h for h in hard)


def test_validate_plan_flags_calorie_and_protein_gaps_as_soft():
    plan = make_plan(2, kcal=round(TARGETS.target_calories * 0.6), protein=10)
    hard, soft = validate_plan(plan, TARGETS, 2, [])
    assert hard == []
    assert any("kcal" in s for s in soft)
    assert any("Protein" in s for s in soft)


@pytest.mark.asyncio
async def test_prompt_contains_precomputed_targets():
    plan, structured = await run_agent([make_plan(7)])
    prompt = structured.ainvoke.call_args.args[0][1].content
    assert f"Calo mục tiêu mỗi ngày: {TARGETS.target_calories} kcal" in prompt
    assert f"BMR: {TARGETS.bmr} kcal" in prompt
    assert f"khoảng {TARGETS.protein_g} g" in prompt
    assert structured.ainvoke.call_count == 1


@pytest.mark.asyncio
async def test_profile_summary_overridden_with_server_values():
    plan, _ = await run_agent([make_plan(7)])
    assert plan.profile_summary.bmi == TARGETS.bmi
    assert plan.profile_summary.target_daily_calories == TARGETS.target_calories


@pytest.mark.asyncio
async def test_bmi_from_web_is_used():
    plan, structured = await run_agent([make_plan(7)], bmi=27.3)
    assert plan.profile_summary.bmi == 27.3
    assert "Béo phì" in plan.profile_summary.bmi_category
    assert "27.3" in structured.ainvoke.call_args.args[0][1].content


@pytest.mark.asyncio
async def test_retries_after_format_error():
    plan, structured = await run_agent([ValueError("Truncated JSON syntax"), make_plan(7)])
    assert structured.ainvoke.call_count == 2


@pytest.mark.asyncio
async def test_retries_when_allergen_found_then_returns_clean_plan():
    bad = make_plan(7, lunch_name="Đậu phụ sốt cà", lunch_ingredients=["Đậu phụ 150g"])
    good = make_plan(7)
    plan, structured = await run_agent([bad, good], allergies=["soy"])
    assert structured.ainvoke.call_count == 2
    assert plan.weekly_plan[0].lunch.name == "Cơm gạo lứt rau củ"
    feedback = structured.ainvoke.call_args_list[1].args[0][-1].content
    assert "dị ứng" in feedback


@pytest.mark.asyncio
async def test_retries_when_day_count_is_wrong():
    plan, structured = await run_agent([make_plan(3), make_plan(7)])
    assert structured.ainvoke.call_count == 2
    assert len(plan.weekly_plan) == 7


@pytest.mark.asyncio
async def test_fails_when_allergen_never_removed():
    bad = make_plan(7, lunch_name="Đậu phụ sốt cà", lunch_ingredients=["Đậu phụ 150g"])
    patcher, structured = mock_llm([copy.deepcopy(bad) for _ in range(3)])
    with patcher, pytest.raises(RuntimeError):
        await MealPlannerAgent().generate_plan(days=7, allergies=["soy"], **PROFILE)
    assert structured.ainvoke.call_count == 3


@pytest.mark.asyncio
async def test_returns_closest_plan_when_only_calories_are_off():
    off = make_plan(7, kcal=round(TARGETS.target_calories * 0.6))
    plan, structured = await run_agent([copy.deepcopy(off) for _ in range(3)])
    assert structured.ainvoke.call_count == 3
    assert len(plan.weekly_plan) == 7
    # Profile numbers still come from the server, not the LLM
    assert plan.profile_summary.target_daily_calories == TARGETS.target_calories
