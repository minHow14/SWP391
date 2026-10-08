import logging
from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from core.config import settings
from core.security import RequestIdentity, resolve_identity
from core.database import record_ai_log
from agents.meal_planner_agent import meal_planner_agent, GeneratedMealPlan

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/meal-planner", tags=["Meal Planner"])


class MealPlanRequest(BaseModel):
    height_cm: float = Field(..., gt=50, lt=260, description="Chiều cao (cm), ví dụ 170")
    weight_kg: float = Field(..., gt=20, lt=300, description="Cân nặng (kg), ví dụ 65")
    age: Optional[int] = Field(25, ge=10, le=120, description="Độ tuổi")
    gender: Optional[str] = Field("unspecified", description="Giới tính: male, female, other")
    goal: str = Field(
        "maintenance",
        description="Mục tiêu sức khỏe: weight_loss (giảm cân), muscle_gain (tăng cơ), maintenance (duy trì)",
    )
    dietary_type: str = Field(
        "vegan",
        description="Trường phái ăn chay: vegan (thuần chay), lacto, ovo, lacto_ovo",
    )
    allergies: Optional[List[str]] = Field(
        default_factory=list,
        description="Danh sách dị ứng: ví dụ ['peanuts', 'soy', 'gluten']",
    )
    available_ingredients: Optional[List[str]] = Field(
        default_factory=list,
        description="Danh sách nguyên liệu đang có sẵn tại nhà: ví dụ ['đậu phụ', 'nấm hương', 'cà chua', 'gạo lứt']",
    )
    days: Optional[int] = Field(7, ge=1, le=7, description="Số ngày cần lập thực đơn (mặc định 7 ngày)")


class MealPlanResponse(BaseModel):
    success: bool = True
    data: GeneratedMealPlan


@router.post("/generate", response_model=MealPlanResponse)
async def generate_meal_plan(
    body: MealPlanRequest,
    identity: RequestIdentity = Depends(resolve_identity),
):
    """
    Tự động lập thực đơn chay cá nhân hóa (Personalized Weekly Meal Planner)
    dựa trên BMI, mục tiêu sức khỏe, dị ứng thực phẩm và nguyên liệu có sẵn.
    """
    try:
        plan: GeneratedMealPlan = await meal_planner_agent.generate_plan(
            height_cm=body.height_cm,
            weight_kg=body.weight_kg,
            age=body.age,
            gender=body.gender,
            goal=body.goal,
            dietary_type=body.dietary_type,
            allergies=body.allergies,
            available_ingredients=body.available_ingredients,
            days=body.days or 7,
        )

        user_tag = identity.user_id if identity.is_authenticated else (identity.guest_id or "guest")
        record_ai_log(
            model_name=settings.DEEPSEEK_MODEL,
            action=f"MEAL_PLANNER_{user_tag}",
            status="SUCCESS",
        )

        return MealPlanResponse(success=True, data=plan)

    except Exception as e:
        logger.error(f"Error generating meal plan: {e}", exc_info=True)
        record_ai_log(
            model_name=settings.DEEPSEEK_MODEL,
            action="MEAL_PLANNER_ERROR",
            status="ERROR",
            error_feedback=str(e),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "MEAL_PLAN_GENERATION_FAILED",
                    "message": "Không thể tạo thực đơn chay tự động vào lúc này. Vui lòng thử lại sau.",
                    "details": str(e) if settings.DEBUG else None,
                },
            },
        )
