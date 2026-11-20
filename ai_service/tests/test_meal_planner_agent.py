# D:/SWP391/SWP391/ai_service/tests/test_meal_planner_agent.py
# Kiểm thử MealPlannerAgent ở mức đơn vị: hậu kiểm thực đơn (validate_plan), prompt có chỉ tiêu
# tính sẵn, giá trị hồ sơ do server ghi đè và vòng thử lại khi LLM vi phạm ràng buộc.
import copy
from unittest.mock import AsyncMock, patch

import pytest

from agents.meal_planner_agent import (
    DailyMealPlan,
    GeneratedMealPlan,
    MealItem,
    MealPlannerAgent,
    MealPlanProfile,
    validate_plan,
)
from core.nutrition import calculate_targets

# Hồ sơ người dùng mẫu và chỉ tiêu dinh dưỡng tính từ nó; được dùng lại ở các file test khác.
PROFILE = {"height_cm": 165, "weight_kg": 55, "age": 25, "gender": "female", "goal": "maintenance", "activity_level": "light"}
TARGETS = calculate_targets(**PROFILE)
DAY_NAMES = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"]


# Tạo một món ăn với calo/protein cho trước; carb và chất béo cố định để đơn giản hoá phép thử.
def make_meal(name, kcal, protein, ingredients=None):
    return MealItem(
        name=name,
        ingredients=ingredients or ["Gạo lứt 100g", "Rau củ 150g"],
        estimated_calories=kcal,
        protein_g=protein,
        carbs_g=40.0,
        fat_g=10.0,
    )


# Phân bổ calo/protein theo tỷ lệ 25/35/30/10 cho bốn bữa; bữa phụ nhận phần dư để tổng khớp đúng mục tiêu.
# profile_summary cố tình điền sai để kiểm tra server có ghi đè bằng số liệu tự tính.
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


# Mock structured LLM: side_effect là danh sách để mô phỏng chuỗi kết quả qua các lần thử lại.
def mock_llm(results):
    """Trả về (patcher, structured_mock): mỗi lần ainvoke trả/ném lần lượt phần tử trong results."""
    structured = AsyncMock()
    structured.ainvoke.side_effect = results
    return patch("agents.meal_planner_agent.get_structured_llm", return_value=structured), structured


# Chạy agent với LLM giả và trả về (thực đơn, mock) để kiểm tra số lần gọi và nội dung prompt.
async def run_agent(results, days=7, allergies=None, **extra):
    patcher, structured = mock_llm(results)
    with patcher:
        plan = await MealPlannerAgent().generate_plan(days=days, allergies=allergies, **PROFILE, **extra)
    return plan, structured


# Thực đơn khớp mục tiêu không có lỗi cứng hay lỗi mềm.
def test_validate_plan_accepts_matching_plan():
    hard, soft = validate_plan(make_plan(7), TARGETS, 7, [])
    assert hard == [] and soft == []


# Sai số ngày hoặc chứa chất gây dị ứng là lỗi cứng (bắt buộc sinh lại).
def test_validate_plan_flags_wrong_day_count_and_allergen():
    plan = make_plan(3, lunch_name="Đậu phụ sốt cà", lunch_ingredients=["Đậu phụ 150g"])
    hard, _soft = validate_plan(plan, TARGETS, 7, ["soy"])
    assert any("đúng 7 ngày" in h for h in hard)
    assert any("dị ứng 'soy'" in h for h in hard)


# Lệch calo/protein chỉ là lỗi mềm: không an toàn tuyệt đối nhưng vẫn chấp nhận được nếu hết lượt thử.
def test_validate_plan_flags_calorie_and_protein_gaps_as_soft():
    plan = make_plan(2, kcal=round(TARGETS.target_calories * 0.6), protein=10)
    hard, soft = validate_plan(plan, TARGETS, 2, [])
    assert hard == []
    assert any("kcal" in s for s in soft)
    assert any("Protein" in s for s in soft)


# Prompt phải chứa chỉ tiêu do server tính sẵn (calo, BMR, protein) để LLM không tự tính sai.
@pytest.mark.asyncio
async def test_prompt_contains_precomputed_targets():
    _plan, structured = await run_agent([make_plan(7)])
    prompt = structured.ainvoke.call_args.args[0][1].content
    assert f"Calo mục tiêu mỗi ngày: {TARGETS.target_calories} kcal" in prompt
    assert f"BMR: {TARGETS.bmr} kcal" in prompt
    assert f"khoảng {TARGETS.protein_g} g" in prompt
    assert structured.ainvoke.call_count == 1


# BMI và calo mục tiêu trong kết quả luôn lấy từ server, không tin số LLM tự điền.
@pytest.mark.asyncio
async def test_profile_summary_overridden_with_server_values():
    plan, _ = await run_agent([make_plan(7)])
    assert plan.profile_summary.bmi == TARGETS.bmi
    assert plan.profile_summary.target_daily_calories == TARGETS.target_calories


# BMI do web gửi lên được ưu tiên sử dụng cả trong kết quả lẫn prompt.
@pytest.mark.asyncio
async def test_bmi_from_web_is_used():
    plan, structured = await run_agent([make_plan(7)], bmi=27.3)
    assert plan.profile_summary.bmi == 27.3
    assert "Béo phì" in plan.profile_summary.bmi_category
    assert "27.3" in structured.ainvoke.call_args.args[0][1].content


# Lỗi định dạng (JSON bị cắt) -> thử lại.
@pytest.mark.asyncio
async def test_retries_after_format_error():
    _plan, structured = await run_agent([ValueError("Truncated JSON syntax"), make_plan(7)])
    assert structured.ainvoke.call_count == 2


# Thực đơn chứa chất gây dị ứng -> thử lại kèm phản hồi lỗi, trả về thực đơn sạch ở lần sau.
@pytest.mark.asyncio
async def test_retries_when_allergen_found_then_returns_clean_plan():
    bad = make_plan(7, lunch_name="Đậu phụ sốt cà", lunch_ingredients=["Đậu phụ 150g"])
    good = make_plan(7)
    plan, structured = await run_agent([bad, good], allergies=["soy"])
    assert structured.ainvoke.call_count == 2
    assert plan.weekly_plan[0].lunch.name == "Cơm gạo lứt rau củ"
    feedback = structured.ainvoke.call_args_list[1].args[0][-1].content
    assert "dị ứng" in feedback


# Sai số ngày -> thử lại đến khi đúng.
@pytest.mark.asyncio
async def test_retries_when_day_count_is_wrong():
    plan, structured = await run_agent([make_plan(3), make_plan(7)])
    assert structured.ainvoke.call_count == 2
    assert len(plan.weekly_plan) == 7


# Hết 3 lượt mà vẫn còn chất gây dị ứng -> báo lỗi, không trả thực đơn nguy hiểm cho người dùng.
@pytest.mark.asyncio
async def test_fails_when_allergen_never_removed():
    bad = make_plan(7, lunch_name="Đậu phụ sốt cà", lunch_ingredients=["Đậu phụ 150g"])
    patcher, structured = mock_llm([copy.deepcopy(bad) for _ in range(3)])
    with patcher, pytest.raises(RuntimeError):
        await MealPlannerAgent().generate_plan(days=7, allergies=["soy"], **PROFILE)
    assert structured.ainvoke.call_count == 3


# Nếu chỉ lệch calo (lỗi mềm) thì sau khi hết lượt vẫn trả về thực đơn gần nhất.
@pytest.mark.asyncio
async def test_returns_closest_plan_when_only_calories_are_off():
    off = make_plan(7, kcal=round(TARGETS.target_calories * 0.6))
    plan, structured = await run_agent([copy.deepcopy(off) for _ in range(3)])
    assert structured.ainvoke.call_count == 3
    assert len(plan.weekly_plan) == 7
    # Số liệu hồ sơ vẫn lấy từ server, không lấy từ LLM
    assert plan.profile_summary.target_daily_calories == TARGETS.target_calories


# Danh sách nguyên liệu có sẵn đã dùng do server tự tính từ thực đơn, không dựa vào LLM.
@pytest.mark.asyncio
async def test_used_available_ingredients_is_computed_by_server():
    plan, _ = await run_agent([make_plan(7)], available_ingredients=["gạo lứt", "xoài"])
    assert plan.profile_summary.used_available_ingredients == ["gạo lứt"]


# LLM bỏ qua nguyên liệu có sẵn trong bếp -> thử lại để tận dụng nguyên liệu người dùng đã có.
@pytest.mark.asyncio
async def test_retries_when_pantry_ingredients_are_ignored():
    ignoring = make_plan(7)
    using = make_plan(7, lunch_ingredients=["Gạo lứt 100g", "Cà chua 100g", "Đậu phụ 100g"])
    plan, structured = await run_agent([ignoring, using], available_ingredients=["cà chua", "đậu phụ"])
    assert structured.ainvoke.call_count == 2
    assert plan.profile_summary.used_available_ingredients == ["cà chua", "đậu phụ"]


# Thực đơn thuần chay có trứng -> sinh lại kèm phản hồi nêu rõ chế độ vegan.
@pytest.mark.asyncio
async def test_vegan_plan_with_egg_is_regenerated():
    with_egg = make_plan(7, lunch_name="Cơm chiên trứng", lunch_ingredients=["Cơm 150g", "Trứng gà 1 quả"])
    _plan, structured = await run_agent([with_egg, make_plan(7)], dietary_type="vegan")
    assert structured.ainvoke.call_count == 2
    feedback = structured.ainvoke.call_args_list[1].args[0][-1].content
    assert "vegan" in feedback


# Chế độ chay trứng sữa chấp nhận trứng nên không cần thử lại.
@pytest.mark.asyncio
async def test_lacto_ovo_plan_with_egg_is_accepted():
    with_egg = make_plan(7, lunch_name="Cơm chiên trứng", lunch_ingredients=["Cơm 150g", "Trứng gà 1 quả"])
    _plan, structured = await run_agent([with_egg], dietary_type="lacto_ovo")
    assert structured.ainvoke.call_count == 1
