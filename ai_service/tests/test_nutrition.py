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


def test_find_used_ingredients_is_fuzzy_and_accent_insensitive():
    from core.nutrition import find_used_ingredients

    meals = [
        ("Bữa trưa", "Đậu hũ sốt cà", ["Đậu hũ non 150g", "Cà chua bi 100g"]),
        ("Bữa tối", "Canh rau", ["Bí đao 200g"]),
    ]
    used = find_used_ingredients(["cà chua", "dau hu", "gạo lứt", "bí đao", "ab"], meals)
    assert used == ["cà chua", "dau hu", "bí đao"]


def test_allergen_aliases_cover_common_hidden_forms():
    def hit(allergy, ingredient):
        return bool(find_allergen_violations([("Bữa trưa", "Món", [ingredient])], [allergy]))

    # Đậu nành ở nhiều dạng
    for ingredient in ["Tofu 150g", "Đậu edamame 100g", "Tàu hũ ky 50g", "Xì dầu 1 thìa", "Đậu tương"]:
        assert hit("soy", ingredient), ingredient
    # Gluten trong mì, bánh mì, mì soba, đạm lúa mì
    for ingredient in ["Mì xào 200g", "Mì soba 100g", "Bánh mì nguyên cám", "Bò lát chay (đạm lúa mì)", "Pasta"]:
        assert hit("gluten", ingredient), ingredient
    # Tên dị ứng dạng số nhiều / tiếng Việt
    assert hit("peanuts", "Bơ đậu phộng 15g")
    assert hit("eggs", "Trứng luộc")
    assert hit("đậu hũ", "Tofu chiên")
    assert hit("tree nuts", "Hạt điều rang")
    # Không báo nhầm
    assert not hit("soy", "Đậu xanh 50g")
    assert not hit("gluten", "Gạo lứt 100g")


def test_diet_key_normalizes_common_spellings():
    from core.nutrition import diet_key

    assert diet_key("vegan") == "vegan"
    assert diet_key("Thuần chay") == "vegan"
    assert diet_key("lacto") == "lacto"
    assert diet_key("lacto-vegetarian") == "lacto"
    assert diet_key("ovo") == "ovo"
    assert diet_key("lacto_ovo") == "lacto_ovo"
    assert diet_key(None) == "lacto_ovo"


def test_diet_violations_by_dietary_type():
    from core.nutrition import find_diet_violations

    egg = [("Bữa sáng", "Bánh mì ốp la", ["Trứng gà 1 quả"])]
    milk = [("Bữa phụ", "Sữa chua", ["Sữa chua 100g"])]
    honey = [("Bữa phụ", "Trà", ["Mật ong 1 thìa"])]
    assert find_diet_violations(egg, "vegan")
    assert find_diet_violations(milk, "vegan")
    assert find_diet_violations(honey, "vegan")
    assert find_diet_violations(egg, "lacto")       # lacto: có sữa, không trứng
    assert not find_diet_violations(milk, "lacto")
    assert find_diet_violations(milk, "ovo")        # ovo: có trứng, không sữa
    assert not find_diet_violations(egg, "ovo")
    assert not find_diet_violations(egg + milk + honey, "lacto_ovo")


def test_animal_products_rejected_for_every_diet_but_vegan_substitutes_allowed():
    from core.nutrition import find_diet_violations

    meat = [("Bữa trưa", "Cơm", ["Thịt heo 100g"])]
    fish_sauce = [("Bữa trưa", "Rau luộc", ["Nước mắm 1 thìa"])]
    fake = [("Bữa trưa", "Cơm tấm chay", ["Thịt chay 100g", "Nước mắm chay 1 thìa"])]
    for diet in ("vegan", "lacto", "ovo", "lacto_ovo"):
        assert find_diet_violations(meat, diet)
        assert find_diet_violations(fish_sauce, diet)
        assert not find_diet_violations(fake, diet)
