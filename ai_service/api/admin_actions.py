# ai_service/api/admin_actions.py
# ai_service/api/admin_actions.py
from typing import Any

from fastapi import APIRouter, Depends, Request

from agents.chatbot_agent import chatbot_agent
from core.security import verify_internal_api_key
from schemas.base import CamelModel

router = APIRouter(
    prefix="/admin",
    tags=["Admin - Internal Cache"],
    dependencies=[Depends(verify_internal_api_key)],
)


class CacheClearData(CamelModel):
    cleared: int


class CacheClearResponse(CamelModel):
    success: bool = True
    message: str = "Đã xóa bộ nhớ đệm chatbot."
    data: CacheClearData
    meta: dict[str, Any]


@router.post("/chatbot-cache/clear", response_model=CacheClearResponse)
async def clear_chatbot_cache(request: Request):
    """
    Xóa bộ nhớ đệm câu trả lời của chatbot (gọi nội bộ từ Backend Gateway).
    """
    cleared = chatbot_agent.clear_cache()
    return CacheClearResponse(
        data=CacheClearData(cleared=cleared),
        meta={"requestId": getattr(request.state, "request_id", "admin_req")},
    )
