import json
import logging
from pathlib import Path
from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage
from core.llm import get_llm_text

logger = logging.getLogger(__name__)
PROMPT_FILE = Path(__file__).resolve().parent.parent / "prompts" / "meal_planner.md"


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


class MealPlannerAgent:
    """
    Agent responsible for generating structured vegetarian meal plans using Generative AI.
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
        """
        Tính BMI và phân loại theo chuẩn WHO/Asian.
        """
        height_m = height_cm / 100.0
        bmi = round(weight_kg / (height_m * height_m), 1)
        if bmi < 18.5:
            category = "Thiếu cân (Underweight)"
        elif bmi < 23.0:
            category = "Bình thường (Normal weight)"
        elif bmi < 25.0:
            category = "Thừa cân (Overweight)"
        else:
            category = "Béo phì (Obese)"
        return bmi, category

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
    ) -> GeneratedMealPlan:
        bmi, bmi_category = self.calculate_bmi_info(height_cm, weight_kg)
        allergies = allergies or []
        available_ingredients = available_ingredients or []

        user_input_prompt = f"""
Hãy tạo thực đơn chay chi tiết {days} ngày (từ Thứ Hai đến Chủ Nhật) dựa trên hồ sơ sau:
- Chiều cao: {height_cm} cm
- Cân nặng: {weight_kg} kg
- Chỉ số BMI: {bmi} ({bmi_category})
- Tuổi: {age} tuổi
- Giới tính: {gender}
- Mục tiêu sức khỏe: {goal}
- Chế độ ăn chay: {dietary_type}
- DỊ ỨNG & KIÊNG ĂN (TUYỆT ĐỐI TRÁNH): {', '.join(allergies) if allergies else 'Không có'}
- NGUYÊN LIỆU ĐÃ CÓ SẴN (Ưu tiên tận dụng): {', '.join(available_ingredients) if available_ingredients else 'Không có nguyên liệu sẵn, tự do đề xuất'}

Yêu cầu xuất ra cấu trúc JSON thuần túy tuân thủ schema Pydantic:
- title: Tiêu đề
- summary: Tóm tắt dinh dưỡng
- profile_summary: bmi, bmi_category, target_daily_calories, primary_goal, dietary_type, used_available_ingredients
- weekly_plan: danh sách {days} ngày, mỗi ngày có bữa sáng (breakfast), trưa (lunch), tối (dinner), phụ (snacks), đầy đủ calories, protein_g, carbs_g, fat_g
- grocery_shopping_list: danh sách mua sắm những đồ còn thiếu
- nutritionist_tips: các mẹo hữu ích cho chế độ ăn này
"""

        system_prompt = self.load_prompt()
        llm = get_llm_text()

        # Bind structured output or parse JSON
        structured_llm = llm.with_structured_output(GeneratedMealPlan)

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_input_prompt),
        ]

        logger.info(f"Generating personalized meal plan with BMI={bmi}, goal={goal}")
        result: GeneratedMealPlan = await structured_llm.ainvoke(messages)
        return result


meal_planner_agent = MealPlannerAgent()
