import logging
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage
from core.llm import get_llm_json
from core.nutrition import (
    NutritionTargets,
    bmi_category,
    calculate_bmi,
    calculate_targets,
    find_allergen_violations,
)

logger = logging.getLogger(__name__)
PROMPT_FILE = Path(__file__).resolve().parent.parent / "prompts" / "meal_planner.md"

CALORIE_TOLERANCE = 0.10   # tổng calo mỗi ngày được lệch tối đa 10% so với mục tiêu
PROTEIN_MIN_RATIO = 0.8    # protein trung bình mỗi ngày tối thiểu 80% mục tiêu
MAX_ATTEMPTS = 3


class MealItem(BaseModel):
    name: str = Field(..., description="Tên món ăn (tiếng Việt)")
    ingredients: List[str] = Field(..., description="Danh sách nguyên liệu chính kèm khối lượng ước lượng")
    instructions: Optional[str] = Field(None, description="Cách chế biến nhanh hoặc mẹo nấu")
    estimated_calories: int = Field(..., description="Lượng calo ước tính (kcal)")
    protein_g: float = Field(..., description="Lượng protein (g)")
    carbs_g: float = Field(..., description="Lượng carbs (g)")
    fat_g: float = Field(..., description="Lượng chất béo fat (g)")


class DailyMealPlan(BaseModel):
    day: str = Field(..., description="Thứ trong tuần, ví dụ: Thứ Hai, Thứ Ba...")
    day_number: int = Field(..., description="Số thứ tự ngày (1-7)")
    breakfast: MealItem = Field(..., description="Bữa sáng")
    lunch: MealItem = Field(..., description="Bữa trưa")
    dinner: MealItem = Field(..., description="Bữa tối")
    snacks: Optional[MealItem] = Field(None, description="Bữa phụ / tráng miệng lành mạnh")
    daily_calories: int = Field(..., description="Tổng calo cả ngày (kcal)")
    daily_protein_g: float = Field(..., description="Tổng protein (g)")
    daily_carbs_g: float = Field(..., description="Tổng carbs (g)")
    daily_fat_g: float = Field(..., description="Tổng chất béo fat (g)")


class MealPlanProfile(BaseModel):
    bmi: float
    bmi_category: str
    target_daily_calories: int
    primary_goal: str
    dietary_type: str
    used_available_ingredients: List[str]


class GeneratedMealPlan(BaseModel):
    title: str = Field(..., description="Tiêu đề thực đơn tuần")
    summary: str = Field(..., description="Tóm tắt định hướng dinh dưỡng và lý do thiết kế thực đơn")
    profile_summary: MealPlanProfile
    weekly_plan: List[DailyMealPlan]
    grocery_shopping_list: List[str] = Field(..., description="Danh sách nguyên liệu cần mua bổ sung ngoài đồ đã có sẵn")
    nutritionist_tips: List[str] = Field(..., description="Lời khuyên dinh dưỡng, uống nước, bổ sung vi chất (B12, Sắt, Canxi)")


def _day_meals(day: DailyMealPlan) -> List[tuple[str, MealItem]]:
    meals = [("Bữa sáng", day.breakfast), ("Bữa trưa", day.lunch), ("Bữa tối", day.dinner)]
    if day.snacks:
        meals.append(("Bữa phụ", day.snacks))
    return meals


def validate_plan(
    plan: GeneratedMealPlan,
    targets: NutritionTargets,
    days: int,
    allergies: List[str],
) -> tuple[List[str], List[str]]:
    """
    Hậu kiểm thực đơn do LLM sinh. Trả về (lỗi nghiêm trọng, lỗi nhẹ).
    - Nghiêm trọng (không được trả cho người dùng): sai số ngày, chứa nguyên liệu dị ứng.
    - Nhẹ (chấp nhận nếu hết lượt thử): lệch calo, thiếu protein.
    Calo và protein được cộng từ các bữa, không tin các trường tổng do LLM tự điền.
    """
    hard: List[str] = []
    soft: List[str] = []

    if len(plan.weekly_plan) != days:
        hard.append(f"Thực đơn phải có đúng {days} ngày nhưng đang có {len(plan.weekly_plan)} ngày.")

    meals_for_allergy = []
    total_protein = 0.0
    low = targets.target_calories * (1 - CALORIE_TOLERANCE)
    high = targets.target_calories * (1 + CALORIE_TOLERANCE)
    for day in plan.weekly_plan:
        meals = _day_meals(day)
        day_calories = sum(m.estimated_calories for _, m in meals)
        total_protein += sum(m.protein_g for _, m in meals)
        if not low <= day_calories <= high:
            soft.append(
                f"{day.day}: tổng {day_calories} kcal, cần nằm trong khoảng {round(low)}-{round(high)} kcal."
            )
        for label, meal in meals:
            meals_for_allergy.append((f"{day.day} - {label}", meal.name, meal.ingredients))

    if plan.weekly_plan:
        avg_protein = total_protein / len(plan.weekly_plan)
        if avg_protein < targets.protein_g * PROTEIN_MIN_RATIO:
            soft.append(
                f"Protein trung bình {round(avg_protein)} g/ngày, cần tối thiểu "
                f"{round(targets.protein_g * PROTEIN_MIN_RATIO)} g/ngày."
            )

    hard.extend(find_allergen_violations(meals_for_allergy, allergies))
    return hard, soft


class MealPlannerAgent:
    """
    Agent responsible for generating structured vegetarian meal plans using Generative AI.
    Calorie and protein targets are calculated here (BMR/TDEE), the LLM only picks the dishes,
    and every generated plan is validated before it is returned.
    """
    def __init__(self):
        self._prompt_template: Optional[str] = None

    def load_prompt(self) -> str:
        if self._prompt_template is None:
            if PROMPT_FILE.exists():
                self._prompt_template = PROMPT_FILE.read_text(encoding="utf-8")
            else:
                self._prompt_template = (
                    "Bạn là chuyên gia dinh dưỡng thực đơn chay. Hãy lập kế hoạch bữa ăn theo yêu cầu."
                )
        return self._prompt_template

    @staticmethod
    def calculate_bmi_info(height_cm: float, weight_kg: float) -> tuple[float, str]:
        """Tính BMI và phân loại theo chuẩn châu Á - Thái Bình Dương."""
        bmi = calculate_bmi(height_cm, weight_kg)
        return bmi, bmi_category(bmi)

    @staticmethod
    def _build_user_prompt(
        targets: NutritionTargets,
        height_cm: float,
        weight_kg: float,
        age: Optional[int],
        gender: Optional[str],
        goal: str,
        dietary_type: str,
        allergies: List[str],
        available_ingredients: List[str],
        days: int,
    ) -> str:
        low = round(targets.target_calories * (1 - CALORIE_TOLERANCE))
        high = round(targets.target_calories * (1 + CALORIE_TOLERANCE))
        note = f"\n- Lưu ý: {targets.note}" if targets.note else ""
        allergy_text = ", ".join(allergies) if allergies else "Không có"
        pantry_text = (
            ", ".join(available_ingredients)
            if available_ingredients
            else "Không có nguyên liệu sẵn, tự do đề xuất"
        )
        return f"""
Hãy tạo thực đơn chay chi tiết {days} ngày (bắt đầu từ Thứ Hai) dựa trên hồ sơ sau:
- Chiều cao: {height_cm} cm
- Cân nặng: {weight_kg} kg
- Chỉ số BMI: {targets.bmi} ({targets.bmi_category})
- Tuổi: {age} tuổi
- Giới tính: {gender}
- Mục tiêu sức khỏe: {goal}
- Chế độ ăn chay: {dietary_type}
- DỊ ỨNG & KIÊNG ĂN (TUYỆT ĐỐI TRÁNH): {allergy_text}
- NGUYÊN LIỆU ĐÃ CÓ SẴN (Ưu tiên tận dụng): {pantry_text}

CHỈ TIÊU DINH DƯỠNG ĐÃ ĐƯỢC TÍNH SẴN (BẮT BUỘC TUÂN THỦ, KHÔNG TỰ ƯỚC LƯỢNG LẠI):
- BMR: {targets.bmr} kcal; TDEE (mức vận động {targets.activity_level}): {targets.tdee} kcal
- Calo mục tiêu mỗi ngày: {targets.target_calories} kcal. Tổng calo các bữa trong MỖI ngày phải nằm trong khoảng {low}-{high} kcal.
- Protein mục tiêu mỗi ngày: khoảng {targets.protein_g} g.{note}

Yêu cầu xuất ra cấu trúc JSON thuần túy tuân thủ schema Pydantic:
- title: Tiêu đề
- summary: Tóm tắt dinh dưỡng
- profile_summary: bmi ({targets.bmi}), bmi_category, target_daily_calories ({targets.target_calories}), primary_goal, dietary_type, used_available_ingredients
- weekly_plan: đúng {days} ngày, mỗi ngày có bữa sáng (breakfast), trưa (lunch), tối (dinner), phụ (snacks), đầy đủ calories, protein_g, carbs_g, fat_g
- grocery_shopping_list: danh sách mua sắm những đồ còn thiếu
- nutritionist_tips: các mẹo hữu ích cho chế độ ăn này
"""

    @staticmethod
    def _finalize(plan: GeneratedMealPlan, targets: NutritionTargets) -> GeneratedMealPlan:
        """Ghi đè các chỉ số hồ sơ bằng giá trị server đã tính, không tin số LLM tự sinh."""
        plan.profile_summary.bmi = targets.bmi
        plan.profile_summary.bmi_category = targets.bmi_category
        plan.profile_summary.target_daily_calories = targets.target_calories
        return plan

    async def generate_plan(
        self,
        height_cm: float,
        weight_kg: float,
        age: Optional[int] = 25,
        gender: Optional[str] = "unspecified",
        goal: str = "maintenance",
        dietary_type: str = "vegan",
        allergies: Optional[List[str]] = None,
        available_ingredients: Optional[List[str]] = None,
        days: int = 7,
        activity_level: str = "light",
        bmi: Optional[float] = None,
    ) -> GeneratedMealPlan:
        allergies = allergies or []
        available_ingredients = available_ingredients or []
        targets = calculate_targets(
            height_cm=height_cm,
            weight_kg=weight_kg,
            age=age,
            gender=gender,
            goal=goal,
            activity_level=activity_level,
            bmi=bmi,
        )

        user_input_prompt = self._build_user_prompt(
            targets, height_cm, weight_kg, age, gender, goal, dietary_type,
            allergies, available_ingredients, days,
        )

        system_prompt = self.load_prompt()
        llm = get_llm_json(timeout=90.0)

        # Bind structured output or parse JSON
        structured_llm = llm.with_structured_output(GeneratedMealPlan, method="function_calling")

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_input_prompt),
        ]

        logger.info(
            f"Generating meal plan: BMI={targets.bmi}, goal={goal}, target={targets.target_calories} kcal"
        )

        last_error = None
        best_plan: Optional[GeneratedMealPlan] = None
        best_soft = 0
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                result = await structured_llm.ainvoke(messages)
                if isinstance(result, dict):
                    result = GeneratedMealPlan.model_validate(result)
                if not isinstance(result, GeneratedMealPlan):
                    raise ValueError("Kết quả từ LLM không đúng định dạng schema GeneratedMealPlan")

                hard, soft = validate_plan(result, targets, days, allergies)
                if hard:
                    last_error = ValueError("; ".join(hard))
                    feedback = (
                        "Thực đơn lần trước vi phạm yêu cầu bắt buộc: "
                        + " ".join(hard)
                        + " Hãy sinh lại toàn bộ thực đơn và sửa các lỗi này."
                    )
                elif soft:
                    if best_plan is None or len(soft) < best_soft:
                        best_plan, best_soft = result, len(soft)
                    last_error = None
                    feedback = (
                        "Thực đơn lần trước chưa đạt chỉ tiêu dinh dưỡng: "
                        + " ".join(soft)
                        + " Hãy điều chỉnh khẩu phần và sinh lại toàn bộ thực đơn."
                    )
                else:
                    return self._finalize(result, targets)
            except Exception as e:
                last_error = e
                feedback = (
                    f"LƯU Ý QUAN TRỌNG: Lần sinh trước bị lỗi định dạng hoặc thiếu trường: {e}. "
                    f"Hãy chắc chắn trả về một đối tượng JSON thuần túy, đầy đủ tất cả các trường "
                    f"theo schema GeneratedMealPlan, không bị cắt ngắn đoạn cuối."
                )

            logger.warning(f"Attempt {attempt}/{MAX_ATTEMPTS} of meal plan needs a retry: {feedback}")
            if attempt < MAX_ATTEMPTS:
                messages.append(HumanMessage(content=feedback))

        # Hết lượt thử: chỉ trả thực đơn lệch nhẹ (không vi phạm dị ứng / số ngày)
        if best_plan is not None:
            logger.warning("Returning the closest meal plan that still misses calorie/protein targets.")
            return self._finalize(best_plan, targets)

        raise RuntimeError(
            f"Không thể tạo thực đơn chay hợp lệ sau {MAX_ATTEMPTS} lần thử: {last_error}"
        )


meal_planner_agent = MealPlannerAgent()
