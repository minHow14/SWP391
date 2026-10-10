import json
import logging
from typing import Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sse_starlette.sse import EventSourceResponse

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
from agents.chatbot_agent import chatbot_agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chatbot"])

MAX_MENU_CONTEXT_CHARS = 8000


# Pydantic Schemas
class ChatMessage(BaseModel):
    role: str = Field(..., description="Vai trò: 'user' hoặc 'assistant'")
    content: str = Field(..., description="Nội dung tin nhắn")


class ChatRequest(BaseModel):
    message: str = Field(..., description="Nội dung câu hỏi hoặc yêu cầu tư vấn dinh dưỡng chay")
    history: Optional[List[ChatMessage]] = Field(
        default_factory=list,
        description="Lịch sử trao đổi trước đó giữa người dùng và trợ lý",
    )
    dietary_type: Optional[str] = Field(
        None,
        description="Trường phái ăn chay của người dùng (ví dụ: vegan, lacto, ovo, lacto_ovo)",
    )
    menu_context: Optional[Any] = Field(
        None,
        description="Thực đơn người dùng vừa được tạo (JSON hoặc văn bản) để chatbot giải thích",
    )

    @field_validator("menu_context")
    @classmethod
    def menu_context_to_text(cls, value: Any) -> Optional[str]:
        if value is None:
            return None
        text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
        text = text.strip()
        if not text:
            return None
        if len(text) > MAX_MENU_CONTEXT_CHARS:
            raise ValueError(f"menu_context không được vượt quá {MAX_MENU_CONTEXT_CHARS} ký tự")
        return text


class ChatData(BaseModel):
    reply: str
    remaining_questions: Optional[int] = None


class ChatResponse(BaseModel):
    success: bool = True
    data: ChatData
    meta: dict


class ChatUsageData(BaseModel):
    is_authenticated: bool
    daily_limit: Optional[int] = None
    used_questions: int = 0
    remaining_questions: Optional[int] = None
    unlimited: bool = False


class ChatUsageResponse(BaseModel):
    success: bool = True
    data: ChatUsageData
    meta: dict


def reserve_guest_quota(identity: RequestIdentity) -> tuple[Optional[str], Optional[int]]:
    """
    Reserves one question for a guest (no-op for authenticated users).
    Returns (guest_id, remaining_questions); guest_id is None for authenticated users.
    Raises HTTP 429 CHAT_QUOTA_EXCEEDED when the daily limit is used up.
    """
    if identity.is_authenticated:
        return None, None
    guest_id = identity.guest_id or "default-guest"
    remaining = reserve_guest_question(guest_id)
    if remaining is None:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "CHAT_QUOTA_EXCEEDED",
                "message": "Bạn đã sử dụng hết lượt hỏi trong ngày.",
                "details": {"resetAt": get_quota_reset_iso()},
            },
        )
    return guest_id, remaining


@router.get("/usage", response_model=ChatUsageResponse)
async def get_usage(request: Request, identity: RequestIdentity = Depends(resolve_identity)):
    """
    Returns the daily usage: unlimited for authenticated users, shared quota for guests
    (chatbot questions and meal plan generations count together).
    """
    if identity.is_authenticated:
        data = ChatUsageData(is_authenticated=True, unlimited=True)
    else:
        used, remaining, limit = get_guest_usage(identity.guest_id or "default-guest")
        data = ChatUsageData(
            is_authenticated=False,
            daily_limit=limit,
            used_questions=used,
            remaining_questions=remaining,
        )
    return ChatUsageResponse(
        success=True,
        data=data,
        meta={"requestId": request.state.request_id},
    )


@router.post("", response_model=ChatResponse)
async def send_chat_message(
    request: Request,
    body: ChatRequest,
    identity: RequestIdentity = Depends(resolve_identity),
):
    """
    Sends a question to the vegetarian chatbot and receives nutrition/recipe guidance.
    Hỗ trợ hội thoại nhiều lượt (history) và ngữ cảnh trường phái ăn chay (dietary_type).
    """
    # 1. Validate message
    clean_message = body.message.strip() if body.message else ""
    if not clean_message:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_INPUT", "message": "Nội dung câu hỏi không được để trống."},
        )

    # 2. Reserve a guest question atomically before calling the AI
    guest_id, remaining = reserve_guest_quota(identity)

    # 3. Call ChatbotAgent to generate AI response
    try:
        reply = await chatbot_agent.answer(
            clean_message,
            history=body.history,
            dietary_type=body.dietary_type,
            menu_context=body.menu_context,
        )

        # 4. Record log
        if not identity.is_authenticated:
            record_ai_log(
                model_name=settings.DEEPSEEK_MODEL,
                action="CHAT_GUEST",
                status="SUCCESS",
            )
        else:
            record_ai_log(
                model_name=settings.DEEPSEEK_MODEL,
                action=f"CHAT_USER_{identity.user_id}",
                status="SUCCESS",
            )

        return ChatResponse(
            success=True,
            data=ChatData(reply=reply, remaining_questions=remaining),
            meta={"requestId": request.state.request_id},
        )

    except Exception as e:
        logger.error(f"Error invoking DeepSeek LLM: {e}", exc_info=True)
        if guest_id:
            release_guest_question(guest_id)
        record_ai_log(
            model_name=settings.DEEPSEEK_MODEL,
            action="CHAT_ERROR",
            status="ERROR",
            error_feedback=str(e),
        )
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": "AI_PROVIDER_ERROR",
                "message": "Nhà cung cấp AI gặp sự cố. Vui lòng thử lại sau.",
                "details": str(e) if settings.DEBUG else None,
            },
        )


@router.post("/stream")
async def stream_chat_message(
    request: Request,
    body: ChatRequest,
    identity: RequestIdentity = Depends(resolve_identity),
):
    """
    Streams the response from the vegetarian chatbot chunk by chunk via Server-Sent Events (SSE).
    """
    clean_message = body.message.strip() if body.message else ""
    if not clean_message:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_INPUT", "message": "Nội dung câu hỏi không được để trống."},
        )

    # Reserve a guest question atomically before streaming starts
    guest_id, remaining = reserve_guest_quota(identity)

    async def event_generator():
        try:
            async for chunk in chatbot_agent.answer_stream(
                clean_message,
                history=body.history,
                dietary_type=body.dietary_type,
                menu_context=body.menu_context,
            ):
                yield {
                    "event": "token",
                    "data": json.dumps({"token": chunk}, ensure_ascii=False),
                }

            # Record log on stream completion
            if not identity.is_authenticated:
                record_ai_log(
                    model_name=settings.DEEPSEEK_MODEL,
                    action="CHAT_STREAM_GUEST",
                    status="SUCCESS",
                )
            else:
                record_ai_log(
                    model_name=settings.DEEPSEEK_MODEL,
                    action=f"CHAT_STREAM_USER_{identity.user_id}",
                    status="SUCCESS",
                )

            yield {
                "event": "done",
                "data": json.dumps({
                    "status": "completed",
                    "remaining_questions": remaining,
                }, ensure_ascii=False),
            }

        except Exception as e:
            logger.error(f"Error streaming response from LLM: {e}", exc_info=True)
            if guest_id:
                release_guest_question(guest_id)
            record_ai_log(
                model_name=settings.DEEPSEEK_MODEL,
                action="CHAT_STREAM_ERROR",
                status="ERROR",
                error_feedback=str(e),
            )
            yield {
                "event": "error",
                "data": json.dumps({
                    "success": False,
                    "error": {
                        "code": "AI_PROVIDER_ERROR",
                        "message": "Lỗi kết nối nhà cung cấp AI khi truyền stream dữ liệu.",
                    },
                    "meta": {
                        "requestId": request.state.request_id,
                    },
                }, ensure_ascii=False),
            }

    return EventSourceResponse(event_generator())
