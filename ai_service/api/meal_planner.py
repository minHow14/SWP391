import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from core.config import settings
from core.security import (
    RequestIdentity,
    resolve_identity,
    get_guest_usage,
    reserve_guest_question,
    release_guest_question,
    get_quota_reset_iso,
)
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
    meta: dict


class MealPlanUsageData(BaseModel):
    is_authenticated: bool
    daily_limit: Optional[int] = Field(None, description="Hạn mức số lần tạo/ngày (None nếu không giới hạn)")
    used_plans: int = Field(..., description="Số lần đã tạo hôm nay")
    remaining_plans: Optional[int] = Field(None, description="Số lần còn lại hôm nay (None nếu không giới hạn)")
    unlimited: bool = Field(False, description="True nếu là thành viên đăng nhập không giới hạn")


class MealPlanUsageResponse(BaseModel):
    success: bool = True
    data: MealPlanUsageData
    meta: dict


@router.get("/usage", response_model=MealPlanUsageResponse)
async def get_usage(request: Request, identity: RequestIdentity = Depends(resolve_identity)):
    """
    Kiểm tra số lượt tạo thực đơn còn lại trong ngày.
    Khách (guest): tối đa 3 lượt/ngày, dùng chung với lượt hỏi chatbot.
    Người dùng đã đăng nhập: không giới hạn (unlimited).
    """
    if identity.is_authenticated:
        return MealPlanUsageResponse(
            success=True,
            data=MealPlanUsageData(
                is_authenticated=True,
                daily_limit=None,
                used_plans=0,
                remaining_plans=None,
                unlimited=True,
            ),
            meta={"requestId": request.state.request_id},
        )

    guest_id = identity.guest_id or "default-guest"
    used, remaining, limit = get_guest_usage(guest_id)
    return MealPlanUsageResponse(
        success=True,
        data=MealPlanUsageData(
            is_authenticated=False,
            daily_limit=limit,
            used_plans=used,
            remaining_plans=remaining,
            unlimited=False,
        ),
        meta={"requestId": request.state.request_id},
    )


@router.post("/generate", response_model=MealPlanResponse)
async def generate_meal_plan(
    request: Request,
    body: MealPlanRequest,
    identity: RequestIdentity = Depends(resolve_identity),
):
    """
    Tự động lập thực đơn chay cá nhân hóa (Personalized Weekly Meal Planner)
    dựa trên BMI, mục tiêu sức khỏe, dị ứng thực phẩm và nguyên liệu có sẵn.
    - Khách: giới hạn 3 lượt/ngày, dùng chung với lượt hỏi chatbot (mỗi lần tạo thực đơn tính 1 lượt).
    - Người dùng đã đăng nhập: không giới hạn.
    """
    # 1. Giữ chỗ một lượt cho khách trước khi gọi AI (nguyên tử, tránh vượt hạn mức khi gọi đồng thời)
    guest_id = None
    if not identity.is_authenticated:
        guest_id = identity.guest_id or "default-guest"
        if reserve_guest_question(guest_id) is None:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code": "MEAL_PLAN_QUOTA_EXCEEDED",
                    "message": "Bạn đã sử dụng hết lượt trong ngày (dùng chung cho hỏi chatbot và tạo thực đơn). Vui lòng đăng nhập để dùng không giới hạn.",
                    "details": {"resetAt": get_quota_reset_iso()},
                },
            )

    # 2. Gọi MealPlannerAgent để tạo thực đơn
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

        # 3. Ghi log
        user_tag = guest_id if guest_id else f"USER_{identity.user_id}"

        record_ai_log(
            model_name=settings.DEEPSEEK_MODEL,
            action=f"MEAL_PLANNER_{user_tag}",
            status="SUCCESS",
        )

        return MealPlanResponse(
            success=True,
            data=plan,
            meta={"requestId": request.state.request_id},
        )

    except Exception as e:
        logger.error(f"Error generating meal plan: {e}", exc_info=True)
        if guest_id:
            release_guest_question(guest_id)
        record_ai_log(
            model_name=settings.DEEPSEEK_MODEL,
            action="MEAL_PLANNER_ERROR",
            status="ERROR",
            error_feedback=str(e),
        )
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": "AI_PROVIDER_ERROR",
                "message": "Không thể tạo thực đơn do nhà cung cấp AI gặp sự cố. Vui lòng thử lại sau.",
                "details": str(e) if settings.DEBUG else None,
            },
        )
