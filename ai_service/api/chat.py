# ai_service/api/chat.py
# ai_service/api/chat.py
import json
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import Field, field_validator
from sse_starlette.sse import EventSourceResponse

from agents.chatbot_agent import chatbot_agent
from core.activity_log import record_ai_log
from core.config import settings
from core.prompt_trace import prompt_trace
from core.ratelimit import rate_limit
from core.security import (
    RequestIdentity,
    resolve_identity,
    verify_internal_api_key,
)
from schemas.base import CamelModel

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/chat",
    tags=["Chatbot"],
    dependencies=[Depends(verify_internal_api_key)],
)

MAX_MENU_CONTEXT_CHARS = 8000


# Pydantic Schemas
class ChatMessage(CamelModel):
    role: str = Field(..., description="Vai trò: 'user' hoặc 'assistant'")
    content: str = Field(..., description="Nội dung tin nhắn")


class ChatRequest(CamelModel):
    message: str = Field(..., description="Nội dung câu hỏi hoặc yêu cầu tư vấn dinh dưỡng chay")
    history: list[ChatMessage] | None = Field(
        default_factory=list,
        description="Lịch sử trao đổi trước đó giữa người dùng và trợ lý",
    )
    dietary_type: str | None = Field(
        None,
        description="Trường phái ăn chay của người dùng (ví dụ: vegan, lacto, ovo, lacto_ovo)",
    )
    menu_context: Any | None = Field(
        None,
        description="Thực đơn người dùng vừa được tạo (JSON hoặc văn bản) để chatbot giải thích",
    )

    @field_validator("menu_context")
    @classmethod
    def menu_context_to_text(cls, value: Any) -> str | None:
        if value is None:
            return None
        text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
        text = text.strip()
        if not text:
            return None
        if len(text) > MAX_MENU_CONTEXT_CHARS:
            raise ValueError(f"menu_context không được vượt quá {MAX_MENU_CONTEXT_CHARS} ký tự")
        return text


class ChatData(CamelModel):
    reply: str


class ChatResponse(CamelModel):
    success: bool = True
    message: str = "Xử lý yêu cầu AI thành công."
    data: ChatData
    meta: dict


@router.post("", response_model=ChatResponse)
@rate_limit()
async def send_chat_message(
    request: Request,
    body: ChatRequest,
    identity: Annotated[RequestIdentity, Depends(resolve_identity)],
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
            meta={"requestId": request.state.request_id, "modelName": settings.DEEPSEEK_MODEL},
        )

    except Exception as e:  # noqa: BLE001 -- Provider failures must use the public API error contract.
        logger.error("AI request failed exceptionType=%s", type(e).__name__)
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
            },
        )


@router.post("/stream")
@rate_limit()
async def stream_chat_message(
    request: Request,
    body: ChatRequest,
    identity: Annotated[RequestIdentity, Depends(resolve_identity)],
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
            messages = chatbot_agent.build_messages(
                clean_message, history=body.history, dietary_type=body.dietary_type,
                menu_context=body.menu_context,
            )
            yield {"event": "metadata", "data": json.dumps({
                "success": True, "message": "Prompt prepared.",
                "data": prompt_trace(messages, settings.DEEPSEEK_MODEL),
            }, ensure_ascii=False)}
            async for chunk in chatbot_agent.answer_stream(
                clean_message,
                history=body.history,
                dietary_type=body.dietary_type,
                menu_context=body.menu_context,
                prepared_messages=messages,
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
                    "success": True,
                    "message": "Trả lời thành công.",
                    "status": "completed",
                    "meta": {"requestId": request.state.request_id, "modelName": settings.DEEPSEEK_MODEL},
                }, ensure_ascii=False),
            }

        except Exception as e:  # noqa: BLE001 -- An active SSE stream needs a terminal error event.
            logger.error("AI stream failed exceptionType=%s", type(e).__name__)
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
                    "errorCode": "AI_PROVIDER_ERROR",
                    "message": "Lỗi kết nối nhà cung cấp AI khi truyền stream dữ liệu.",
                    "errors": [],
                    "meta": {
                        "requestId": request.state.request_id,
                    },
                }, ensure_ascii=False),
            }

    return EventSourceResponse(event_generator())
