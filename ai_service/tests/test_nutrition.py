from core.nutrition import (
    bmi_category,
    calculate_bmi,
    calculate_bmr,
    calculate_targets,
    find_allergen_violations,
)


def test_bmi_and_category_asian_thresholds():
    assert calculate_bmi(170, 65) == 22.5
    assert "Thiếu cân" in bmi_category(18.4)
    assert "Bình thường" in bmi_category(22.9)
    assert "Thừa cân" in bmi_category(23.0)
    assert "Béo phì" in bmi_category(25.0)


def test_bmr_mifflin_st_jeor():
    # Nữ 25 tuổi, 165 cm, 60 kg: 10*60 + 6.25*165 - 5*25 - 161 = 1345.25
    assert round(calculate_bmr(60, 165, 25, "female")) == 1345
    # Nam cùng thông số: lệch +166 so với nữ
    assert round(calculate_bmr(60, 165, 25, "male")) == 1511


def test_targets_weight_loss_example():
    t = calculate_targets(165, 60, 25, "female", "weight_loss", "light")
    assert t.bmr == 1345
    assert t.tdee == 1850  # 1345.25 * 1.375
    assert t.target_calories == round(1345.25 * 1.375 * 0.85)
    assert t.protein_g == 84  # 1.4 g/kg
    assert t.note is None


def test_targets_goal_adjustments():
    base = calculate_targets(170, 65, 30, "male", "maintenance", "moderate")
    loss = calculate_targets(170, 65, 30, "male", "weight_loss", "moderate")
    gain = calculate_targets(170, 65, 30, "male", "muscle_gain", "moderate")
    assert loss.target_calories < base.target_calories < gain.target_calories
    assert gain.protein_g > base.protein_g


def test_targets_use_bmi_sent_by_web():
    t = calculate_targets(170, 65, bmi=27.3)
    assert t.bmi == 27.3
    assert "Béo phì" in t.bmi_category


def test_underweight_does_not_get_calorie_deficit():
    t = calculate_targets(170, 45, 25, "female", "weight_loss", "sedentary")
    assert t.target_calories == t.tdee
    assert t.note and "thiếu cân" in t.note


def test_target_never_below_safe_minimum():
    t = calculate_targets(150, 40, 70, "female", "weight_loss", "sedentary", bmi=20.0)
    assert t.target_calories >= 1200


def test_allergen_aliases_vietnamese_and_english():
    meals = [
        ("Bữa sáng", "Cháo yến mạch", ["Yến mạch 50g", "Sữa đậu nành 200ml"]),
        ("Bữa trưa", "Cơm gạo lứt", ["Đậu phụ 150g", "Nấm hương 50g"]),
        ("Bữa tối", "Salad", ["Hạt chia 10g", "Rau xà lách"]),
    ]
    assert find_allergen_violations(meals, ["soy"])  # sữa đậu nành, đậu phụ
    assert find_allergen_violations(meals, ["mushroom"])  # nấm hương
    assert not find_allergen_violations(meals, ["peanuts"])
    # Hạt chia (chia seeds) không bị coi là dị ứng hạt cây; sữa đậu nành không phải sữa động vật
    assert not find_allergen_violations(meals, ["nuts"])
    assert not find_allergen_violations(meals, ["dairy"])
    assert not find_allergen_violations(meals, [""])


def test_negated_allergen_in_dish_name_is_not_a_violation():
    meals = [
        ("Bữa trưa", "Bún gạo lứt trộn đậu hũ (không đậu phộng)", ["Bún gạo lứt 100g", "Rau củ 150g"]),
        ("Bữa tối", "Salad không chứa sữa", ["Xà lách 100g"]),
    ]
    assert not find_allergen_violations(meals, ["peanuts", "dairy"])
    # Nhưng nếu nguyên liệu thật sự có thì vẫn bị bắt
    meals[0] = ("Bữa trưa", "Bún trộn (không đậu phộng)", ["Đậu phộng rang 20g"])
    assert find_allergen_violations(meals, ["peanuts"])
