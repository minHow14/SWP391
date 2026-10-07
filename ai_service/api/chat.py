import logging
from typing import Optional
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from core.config import settings
from core.security import (
    RequestIdentity,
    resolve_identity,
    can_guest_ask,
    get_guest_usage,
    increment_guest_usage,
)
from core.database import record_ai_log
from agents.chatbot_agent import chatbot_agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chatbot"])

# Pydantic Schemas
class ChatRequest(BaseModel):
    message: str = Field(..., description="Message from the user to the vegetarian chatbot")

class ChatData(BaseModel):
    reply: str
    remaining_questions: Optional[int] = None

class ChatResponse(BaseModel):
    success: bool = True
    data: ChatData

class ChatUsageData(BaseModel):
    daily_limit: int
    used_questions: int
    remaining_questions: int

class ChatUsageResponse(BaseModel):
    success: bool = True
    data: ChatUsageData


@router.get("/usage", response_model=ChatUsageResponse)
async def get_usage(identity: RequestIdentity = Depends(resolve_identity)):
    """
    Returns the daily chat usage and remaining questions for guests.
    """
    guest_id = identity.guest_id or "default-guest"
    used, remaining, limit = get_guest_usage(guest_id)
    return ChatUsageResponse(
        success=True,
        data=ChatUsageData(
            daily_limit=limit,
            used_questions=used,
            remaining_questions=remaining,
        ),
    )


@router.post("", response_model=ChatResponse)
async def send_chat_message(
    body: ChatRequest,
    identity: RequestIdentity = Depends(resolve_identity),
):
    """
    Sends a question to the vegetarian chatbot and receives nutrition/recipe guidance.
    """
    # 1. Validate message
    clean_message = body.message.strip() if body.message else ""
    if not clean_message:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": {
                    "code": "INVALID_MESSAGE",
                    "message": "Message cannot be empty.",
                },
            },
        )

    # 2. Check guest limit if not authenticated
    if not identity.is_authenticated:
        guest_id = identity.guest_id or "default-guest"
        if not can_guest_ask(guest_id):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "success": False,
                    "error": {
                        "code": "CHAT_LIMIT_REACHED",
                        "message": "Guest users can ask up to 3 questions per day.",
                        "remaining_questions": 0,
                    },
                },
            )

    # 3. Call ChatbotAgent to generate AI response
    try:
        reply = await chatbot_agent.answer(clean_message)

        # 4. Update usage and record log
        if not identity.is_authenticated:
            guest_id = identity.guest_id or "default-guest"
            remaining = increment_guest_usage(guest_id)
            record_ai_log(
                model_name=settings.DEEPSEEK_MODEL,
                action="CHAT_GUEST",
                status="SUCCESS",
            )
        else:
            remaining = None
            record_ai_log(
                model_name=settings.DEEPSEEK_MODEL,
                action=f"CHAT_USER_{identity.user_id}",
                status="SUCCESS",
            )

        return ChatResponse(
            success=True,
            data=ChatData(reply=reply, remaining_questions=remaining),
        )

    except Exception as e:
        logger.error(f"Error invoking DeepSeek LLM: {e}", exc_info=True)
        record_ai_log(
            model_name=settings.DEEPSEEK_MODEL,
            action="CHAT_ERROR",
            status="ERROR",
            error_feedback=str(e),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "AI_SERVICE_ERROR",
                    "message": "Unable to process the AI request.",
                },
            },
        )
