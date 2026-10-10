import re
from dataclasses import dataclass
from typing import Iterable, List, Optional

from rapidfuzz import fuzz
from unidecode import unidecode

ACTIVITY_FACTORS = {
    "sedentary": 1.2,      # ít vận động
    "light": 1.375,        # vận động nhẹ 1-3 buổi/tuần
    "moderate": 1.55,      # vận động vừa 3-5 buổi/tuần
    "active": 1.725,       # vận động nhiều 6-7 buổi/tuần
    "very_active": 1.9,    # vận động rất nhiều / lao động nặng
}

# Điều chỉnh calo theo mục tiêu (so với TDEE), khớp với prompts/meal_planner.md
GOAL_CALORIE_ADJUSTMENT = {
    "weight_loss": -0.15,
    "maintenance": 0.0,
    "muscle_gain": 0.10,
}

# Protein (g/kg cân nặng/ngày) theo mục tiêu
GOAL_PROTEIN_PER_KG = {
    "weight_loss": 1.4,
    "maintenance": 1.0,
    "muscle_gain": 1.8,
}

# Ngưỡng calo tối thiểu an toàn khi không rõ giới tính / nam / nữ
MIN_SAFE_CALORIES = {"male": 1500, "female": 1200, "other": 1200}


@dataclass(frozen=True)
class NutritionTargets:
    bmi: float
    bmi_category: str
    bmr: int
    tdee: int
    target_calories: int
    protein_g: int
    activity_level: str
    note: Optional[str] = None


def calculate_bmi(height_cm: float, weight_kg: float) -> float:
    height_m = height_cm / 100.0
    return round(weight_kg / (height_m * height_m), 1)


def bmi_category(bmi: float) -> str:
    """Phân loại BMI theo chuẩn châu Á - Thái Bình Dương."""
    if bmi < 18.5:
        return "Thiếu cân (Underweight)"
    if bmi < 23.0:
        return "Bình thường (Normal weight)"
    if bmi < 25.0:
        return "Thừa cân (Overweight)"
    return "Béo phì (Obese)"


def _normalize_gender(gender: Optional[str]) -> str:
    g = (gender or "").strip().lower()
    if g in ("male", "nam", "m"):
        return "male"
    if g in ("female", "nu", "nữ", "f"):
        return "female"
    return "other"


def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: Optional[str]) -> float:
    """Mifflin-St Jeor. Giới tính khác/không rõ dùng trung bình của nam và nữ."""
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    offset = {"male": 5, "female": -161, "other": -78}[_normalize_gender(gender)]
    return base + offset


def calculate_targets(
    height_cm: float,
    weight_kg: float,
    age: Optional[int] = 25,
    gender: Optional[str] = "unspecified",
    goal: str = "maintenance",
    activity_level: str = "light",
    bmi: Optional[float] = None,
) -> NutritionTargets:
    """
    Tính BMR, TDEE, calo mục tiêu và protein mục tiêu. `bmi` do web gửi sang được dùng
    nguyên trạng; nếu không có thì tính từ chiều cao và cân nặng.
    """
    age = age or 25
    bmi_value = bmi if bmi is not None else calculate_bmi(height_cm, weight_kg)
    category = bmi_category(bmi_value)

    bmr = calculate_bmr(weight_kg, height_cm, age, gender)
    tdee = bmr * ACTIVITY_FACTORS.get(activity_level, ACTIVITY_FACTORS["light"])

    adjustment = GOAL_CALORIE_ADJUSTMENT.get(goal, 0.0)
    note = None
    if adjustment < 0 and bmi_value < 18.5:
        adjustment = 0.0
        note = "BMI thiếu cân nên không áp dụng thâm hụt calo, giữ ở mức duy trì."

    target = tdee * (1 + adjustment)
    floor = MIN_SAFE_CALORIES[_normalize_gender(gender)]
    if target < floor:
        target = floor
        note = (note + " " if note else "") + f"Calo mục tiêu được nâng lên mức tối thiểu an toàn {floor} kcal."

    protein = weight_kg * GOAL_PROTEIN_PER_KG.get(goal, GOAL_PROTEIN_PER_KG["maintenance"])
    return NutritionTargets(
        bmi=bmi_value,
        bmi_category=category,
        bmr=round(bmr),
        tdee=round(tdee),
        target_calories=round(target),
        protein_g=round(protein),
        activity_level=activity_level,
        note=note,
    )


# Từ khoá tiếng Việt / Anh của các nhóm dị ứng phổ biến (đã bỏ dấu, chữ thường)
ALLERGEN_ALIASES = {
    "peanut": ["peanut", "dau phong", "lac"],
    "soy": ["soy", "dau nanh", "dau phu", "dau hu", "tempeh", "tuong", "natto", "miso"],
    "gluten": ["gluten", "lua mi", "bot mi", "seitan", "banh mi", "mi soi"],
    "dairy": ["dairy", "milk", "cheese", "butter", "yogurt", "sua bo", "sua tuoi", "sua chua", "pho mai", "kem tuoi", "ghee", "whey"],
    "egg": ["egg", "trung"],
    "mushroom": ["mushroom", "nam"],
    "sesame": ["sesame", "me", "vung"],
    "nut": ["almond", "walnut", "cashew", "hanh nhan", "oc cho", "hat dieu"],
}
_ALLERGEN_GROUP_NAMES = {
    "peanuts": "peanut", "lac": "peanut", "dau phong": "peanut",
    "soy": "soy", "soya": "soy", "dau nanh": "soy", "dau phu": "soy",
    "wheat": "gluten", "gluten": "gluten", "lua mi": "gluten",
    "dairy": "dairy", "milk": "dairy", "sua": "dairy", "lactose": "dairy",
    "eggs": "egg", "egg": "egg", "trung": "egg",
    "mushrooms": "mushroom", "mushroom": "mushroom", "nam": "mushroom",
    "sesame": "sesame", "me": "sesame", "vung": "sesame",
    "nuts": "nut", "tree nuts": "nut",
}


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", unidecode(text).lower()).strip()


# Tên món hay ghi "(không đậu phộng)", "không chứa sữa", "gluten-free": bỏ phần phủ định này
_NEGATION = re.compile(r"\b(?:khong|no|without)\s+(?:co\s+|chua\s+)?[a-z]+(?:\s+[a-z]+)?|\b[a-z]+-free\b")


def _name_without_negation(name: str) -> str:
    return _NEGATION.sub(" ", _norm(name))


def _allergen_terms(allergy: str) -> List[str]:
    key = _norm(allergy)
    group = _ALLERGEN_GROUP_NAMES.get(key)
    return ALLERGEN_ALIASES[group] if group else [key]


def find_allergen_violations(meals: Iterable[tuple[str, str, List[str]]], allergies: List[str]) -> List[str]:
    """
    meals: (nhãn bữa, tên món, nguyên liệu). Trả về danh sách mô tả vi phạm dị ứng,
    so khớp theo từ nguyên vẹn sau khi bỏ dấu.
    """
    violations = []
    for allergy in allergies:
        if not allergy or not allergy.strip():
            continue
        patterns = [re.compile(rf"(?<![a-z0-9]){re.escape(t.strip())}(?![a-z0-9])") for t in _allergen_terms(allergy)]
        for label, name, ingredients in meals:
            haystack = " ; ".join([_name_without_negation(name), *(_norm(i) for i in ingredients)])
            match = next((m for m in (p.search(haystack) for p in patterns) if m), None)
            if match:
                violations.append(
                    f"{label} '{name}' chứa '{match.group(0)}' (liên quan đến dị ứng '{allergy}')"
                )
    return violations


PANTRY_MATCH_THRESHOLD = 88


def find_used_ingredients(available: List[str], meals: Iterable[tuple[str, str, List[str]]]) -> List[str]:
    """
    Nguyên liệu sẵn có thực sự xuất hiện trong thực đơn, so khớp gần đúng (rapidfuzz) và bỏ dấu,
    nên "cà chua" khớp "Cà chua bi 100g". Trả về đúng cách người dùng đã ghi.
    """
    texts = [_norm(" ; ".join([name, *ingredients])) for _, name, ingredients in meals]
    used = []
    for item in available:
        needle = _norm(item)
        if len(needle) < 3:
            continue
        if any(fuzz.partial_ratio(needle, text) >= PANTRY_MATCH_THRESHOLD for text in texts):
            used.append(item)
    return used
