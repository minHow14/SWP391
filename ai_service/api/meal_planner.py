# ai_service/api/meal_planner.py
# ai_service/api/meal_planner.py
import asyncio
import json
import logging
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import Field
from sse_starlette.sse import EventSourceResponse

from agents.meal_planner_agent import (
    GeneratedMealPlan,
    ProgressCallback,
    meal_planner_agent,
)
from core.activity_log import record_ai_log
from core.llm import get_json_model_name
from core.meal_chat import ChatBubble, plan_to_chat_bubble
from core.ratelimit import rate_limit
from core.security import (
    RequestIdentity,
    resolve_identity,
    verify_internal_api_key,
)
from schemas.base import CamelModel

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/meal-planner",
    tags=["Meal Planner"],
    dependencies=[Depends(verify_internal_api_key)],
)


class MealPlanRequest(CamelModel):
    height_cm: float = Field(..., gt=50, lt=260, description="Chiều cao (cm), ví dụ 170")
    weight_kg: float = Field(..., gt=20, lt=300, description="Cân nặng (kg), ví dụ 65")
    bmi: float | None = Field(
        None, gt=8, lt=100,
        description="BMI do web tính sẵn; nếu không gửi, service tự tính từ chiều cao và cân nặng",
    )
    age: int | None = Field(25, ge=10, le=120, description="Độ tuổi")
    gender: str | None = Field("unspecified", description="Giới tính: male, female, other")
    goal: str = Field(
        "maintenance",
        description="Mục tiêu sức khỏe: weight_loss (giảm cân), muscle_gain (tăng cơ), maintenance (duy trì)",
    )
    activity_level: Literal["sedentary", "light", "moderate", "active", "very_active"] = Field(
        "light",
        description="Mức vận động: sedentary (ít), light (nhẹ), moderate (vừa), active (nhiều), very_active (rất nhiều)",
    )
    dietary_type: str = Field(
        "vegan",
        description="Trường phái ăn chay: vegan (thuần chay), lacto, ovo, lacto_ovo",
    )
    allergies: list[str] | None = Field(
        default_factory=list,
        description="Danh sách dị ứng: ví dụ ['peanuts', 'soy', 'gluten']",
    )
    available_ingredients: list[str] | None = Field(
        default_factory=list,
        description="Danh sách nguyên liệu đang có sẵn tại nhà: ví dụ ['đậu phụ', 'nấm hương', 'cà chua', 'gạo lứt']",
    )
    days: int | None = Field(7, ge=1, le=7, description="Số ngày cần lập thực đơn (mặc định 7 ngày)")


class MealPlanData(GeneratedMealPlan):
    """Thực đơn đầy đủ kèm `chat`: bản gọn để hiện thẳng trong bubble của khung chat."""
    chat: ChatBubble


class MealPlanResponse(CamelModel):
    success: bool = True
    message: str = "Tạo thực đơn thành công."
    data: MealPlanData
    meta: dict


async def _generate(
    body: MealPlanRequest,
    identity: RequestIdentity,
    on_progress: ProgressCallback | None = None,
) -> MealPlanData:
    """
    Tạo thực đơn và ghi AILog có cấu trúc.
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
            activity_level=body.activity_level,
            bmi=body.bmi,
            on_progress=on_progress,
        )
    except Exception as e:
        logger.error("Meal generation failed exceptionType=%s", type(e).__name__)
        await record_ai_log(
            model_name=get_json_model_name(),
            action="MEAL_PLANNER_ERROR",
            status="ERROR",
            error_feedback=str(e),
        )
        raise

    user_tag = f"USER_{identity.user_id}" if identity.is_authenticated else f"GUEST_{identity.guest_id}"
    await record_ai_log(
        model_name=get_json_model_name(),
        action=f"MEAL_PLANNER_{user_tag}",
        status="SUCCESS",
    )
    return MealPlanData(**plan.model_dump(), chat=plan_to_chat_bubble(plan))


def _provider_error(e: Exception) -> dict:
    return {
        "code": "AI_PROVIDER_ERROR",
        "message": "Không thể tạo thực đơn do nhà cung cấp AI gặp sự cố. Vui lòng thử lại sau.",
    }


@router.post("/generate", response_model=MealPlanResponse)
@rate_limit()
async def generate_meal_plan(
    request: Request,
    body: MealPlanRequest,
    identity: Annotated[RequestIdentity, Depends(resolve_identity)],
):
    """
    Tự động lập thực đơn chay cá nhân hóa (Personalized Weekly Meal Planner).
    """
    try:
        data = await _generate(body, identity)
    except Exception as e:  # noqa: BLE001 -- Provider failures must use the public API error contract.
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=_provider_error(e))
    return MealPlanResponse(success=True, data=data, meta={"requestId": request.state.request_id, "modelName": get_json_model_name()})


@router.post("/generate/stream")
@rate_limit()
async def generate_meal_plan_stream(
    request: Request,
    body: MealPlanRequest,
    identity: Annotated[RequestIdentity, Depends(resolve_identity)],
):
    """
    Tạo thực đơn và trả về Server-Sent Events để hiển thị tiến độ trong lúc xử lý.
    """
    request_id = request.state.request_id

    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()

        async def on_progress(event: dict) -> None:
            if event.get("stage") == "metadata":
                await queue.put(("metadata", {key: value for key, value in event.items() if key not in {"stage", "message"}}))
            else:
                await queue.put(("progress", event))

        async def runner() -> None:
            try:
                await queue.put(("done", await _generate(body, identity, on_progress)))
            except Exception as e:  # noqa: BLE001 -- Wake the SSE consumer when its inference task fails.
                await queue.put(("error", e))

        task = asyncio.create_task(runner())
        try:
            while True:
                kind, payload = await queue.get()
                if kind in {"progress", "metadata"}:
                    envelope = {"success": True, "message": "Đang tạo thực đơn.", "data": payload, "meta": {"requestId": request_id, "modelName": get_json_model_name()}}
                elif kind == "done":
                    envelope = {"success": True, "message": "Tạo thực đơn thành công.", "data": payload.model_dump(by_alias=True), "meta": {"requestId": request_id, "modelName": get_json_model_name()}}
                else:
                    envelope = {
                        "success": False,
                        "errorCode": "AI_PROVIDER_ERROR",
                        "message": "Không thể tạo thực đơn. Vui lòng thử lại sau.",
                        "errors": [],
                        "meta": {"requestId": request_id, "modelName": get_json_model_name()},
                    }
                yield {"event": kind, "data": json.dumps(envelope, ensure_ascii=False)}
                if kind not in {"progress", "metadata"}:
                    break
        finally:
            if not task.done():
                task.cancel()

    return EventSourceResponse(event_generator())
