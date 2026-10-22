# D:/SWP391/SWP391/ai_service/core/security.py
# ai_service/core/security.py
import logging
import secrets

from fastapi import Header, HTTPException, Request, status
from pydantic import BaseModel

from core.config import settings

logger = logging.getLogger(__name__)


class RequestIdentity(BaseModel):
    is_authenticated: bool
    user_id: str | None = None
    user_role: str | None = None
    guest_id: str | None = None


def verify_internal_api_key(
    x_internal_api_key: str | None = Header(None, alias="X-Internal-Api-Key")
) -> bool:
    """
    Xác thực nội bộ bắt buộc: Chỉ cho phép các request đến từ Backend API Gateway
    có kèm header X-Internal-Api-Key khớp với biến môi trường INTERNAL_API_KEY.
    """
    expected_key = settings.INTERNAL_API_KEY
    if not x_internal_api_key or not secrets.compare_digest(x_internal_api_key, expected_key):
        logger.warning("Rejected unauthorized call to AI service: Missing or invalid X-Internal-Api-Key")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED_INTERNAL",
                "message": "Truy cập bị từ chối: Thiếu hoặc sai khóa xác thực nội bộ X-Internal-Api-Key.",
            },
        )
    return True


def resolve_identity(
    request: Request,
    x_user_id: str | None = Header(None, alias="X-User-Id"),
    x_user_role: str | None = Header(None, alias="X-User-Role"),
    x_guest_id: str | None = Header(None, alias="X-Guest-Id"),
) -> RequestIdentity:
    """
    Định danh người dùng do Backend Gateway gửi sang:
    1. Nếu có X-User-Id -> người dùng đã xác thực.
    2. Nếu không -> khách vãng lai với định danh X-Guest-Id.
    """
    if x_user_id and x_user_id.strip():
        return RequestIdentity(
            is_authenticated=True,
            user_id=x_user_id.strip(),
            user_role=(x_user_role or "USER").strip(),
        )

    guest_id = (x_guest_id or "").strip()
    if not guest_id:
        guest_id = f"ip:{request.client.host if request.client else 'unknown'}"

    return RequestIdentity(is_authenticated=False, guest_id=guest_id)
