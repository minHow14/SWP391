# ai_service/api/chat.py
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
    verify_internal_api_key,
)
from core.database import record_ai_log
from core.ratelimit import rate_limit
from agents.chatbot_agent import chatbot_agent

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/chat",
    tags=["Chatbot"],
    dependencies=[Depends(verify_internal_api_key)],
)

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


@router.post("", response_model=ChatResponse)
@rate_limit()
async def send_chat_message(
    request: Request,
    body: ChatRequest,
    identity: RequestIdentity = Depends(resolve_identity),
):
    """
    Sends a question to the vegetarian chatbot and receives nutrition/recipe guidance.
    """
    clean_message = body.message.strip() if body.message else ""
    if not clean_message:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_INPUT", "message": "Nội dung câu hỏi không được để trống."},
        )

    try:
        reply = await chatbot_agent.answer(
            clean_message,
            history=body.history,
            dietary_type=body.dietary_type,
            menu_context=body.menu_context,
        )

        user_tag = f"USER_{identity.user_id}" if identity.is_authenticated else f"GUEST_{identity.guest_id}"
        await record_ai_log(
            model_name=settings.DEEPSEEK_MODEL,
            action=f"CHAT_{user_tag}",
            status="SUCCESS",
        )

        return ChatResponse(
            success=True,
            data=ChatData(reply=reply),
            meta={"requestId": request.state.request_id},
        )

    except Exception as e:
        logger.error(f"Error invoking DeepSeek LLM: {e}", exc_info=True)
        await record_ai_log(
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
@rate_limit()
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

            user_tag = f"USER_{identity.user_id}" if identity.is_authenticated else f"GUEST_{identity.guest_id}"
            await record_ai_log(
                model_name=settings.DEEPSEEK_MODEL,
                action=f"CHAT_STREAM_{user_tag}",
                status="SUCCESS",
            )

            yield {
                "event": "done",
                "data": json.dumps({
                    "status": "completed",
                }, ensure_ascii=False),
            }

        except Exception as e:
            logger.error(f"Error streaming response from LLM: {e}", exc_info=True)
            await record_ai_log(
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
