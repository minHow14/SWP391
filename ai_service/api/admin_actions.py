from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from agents.chatbot_agent import chatbot_agent
from core.database import record_ai_log
from core.security import (
    RequestIdentity,
    admin_reset_guest_quota,
    get_guest_usage,
    get_quota_reset_iso,
    require_admin,
)

router = APIRouter(prefix="/admin", tags=["Admin - Manual intervention"])


class GuestQuotaRequest(BaseModel):
    guest_id: str = Field(..., min_length=1, max_length=100, description="X-Guest-Id hoặc ip:<địa chỉ> của khách")


class GuestQuotaData(BaseModel):
    guest_id: str
    daily_limit: int
    used: int
    remaining: int
    resets_at: str


class GuestQuotaResetData(GuestQuotaData):
    used_before: int


class CacheClearData(BaseModel):
    cleared: int


class GuestQuotaResponse(BaseModel):
    success: bool = True
    data: GuestQuotaData
    meta: dict[str, Any]


class GuestQuotaResetResponse(BaseModel):
    success: bool = True
    data: GuestQuotaResetData
    meta: dict[str, Any]


class CacheClearResponse(BaseModel):
    success: bool = True
    data: CacheClearData
    meta: dict[str, Any]


async def _audit(admin: RequestIdentity, action: str) -> None:
    """Ghi dấu vết can thiệp của Admin vào bảng ai_logs để truy lại ai đã làm gì."""
    await record_ai_log(model_name="admin", action=f"ADMIN_{action}_BY_{admin.user_id}", status="SUCCESS")


async def _quota(guest_id: str) -> GuestQuotaData:
    used, remaining, limit = await get_guest_usage(guest_id)
    return GuestQuotaData(
        guest_id=guest_id, daily_limit=limit, used=used, remaining=remaining, resets_at=get_quota_reset_iso()
    )


@router.get("/guest-quota/{guest_id}", response_model=GuestQuotaResponse)
async def get_guest_quota(
    guest_id: str,
    request: Request,
    _admin: RequestIdentity = Depends(require_admin),
):
    """Xem hạn mức hôm nay của một khách (tổng câu hỏi chatbot và lần tạo thực đơn)."""
    return GuestQuotaResponse(data=await _quota(guest_id[:100]), meta={"requestId": request.state.request_id})


@router.post("/guest-quota/reset", response_model=GuestQuotaResetResponse)
async def reset_guest_quota(
    body: GuestQuotaRequest,
    request: Request,
    admin: RequestIdentity = Depends(require_admin),
):
    """Đặt lại hạn mức hôm nay của một khách về 0 (ví dụ khách bị chặn nhầm). Có ghi AILog."""
    guest_id = body.guest_id.strip()
    used_before = await admin_reset_guest_quota(guest_id)
    await _audit(admin, f"RESET_GUEST_QUOTA_{guest_id}")
    quota = await _quota(guest_id)
    return GuestQuotaResetResponse(
        data=GuestQuotaResetData(**quota.model_dump(), used_before=used_before),
        meta={"requestId": request.state.request_id},
    )


@router.post("/chatbot-cache/clear", response_model=CacheClearResponse)
async def clear_chatbot_cache(
    request: Request,
    admin: RequestIdentity = Depends(require_admin),
):
    """Xoá cache câu trả lời của chatbot (nên làm sau khi đổi prompt hoặc model). Có ghi AILog."""
    cleared = chatbot_agent.clear_cache()
    await _audit(admin, "CLEAR_CHATBOT_CACHE")
    return CacheClearResponse(data=CacheClearData(cleared=cleared), meta={"requestId": request.state.request_id})

