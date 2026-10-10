from datetime import date, datetime, time, timedelta
from typing import Optional, Tuple
from zoneinfo import ZoneInfo

import jwt
from fastapi import Header, HTTPException, status
from pydantic import BaseModel

from core import quota
from core.config import settings

VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")  # +07:00, không có giờ mùa hè


class RequestIdentity(BaseModel):
    is_authenticated: bool
    user_id: Optional[str] = None
    user_role: Optional[str] = None
    guest_id: Optional[str] = None


def get_today() -> date:
    """Ngày hiện tại theo giờ Việt Nam (+07:00), dùng để tính hạn mức."""
    return datetime.now(VN_TZ).date()


def get_quota_reset_iso() -> str:
    """Thời điểm reset hạn mức (0h hôm sau, giờ Việt Nam) theo ISO 8601, ví dụ 2026-10-11T00:00:00+07:00."""
    next_midnight = datetime.combine(get_today() + timedelta(days=1), time.min, tzinfo=VN_TZ)
    return next_midnight.isoformat()


def _unauthorized(message: str) -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        detail={"code": "UNAUTHORIZED", "message": message},
    )


def _identity_from_token(token: str) -> RequestIdentity:
    """Xác thực JWT do backend Core ký (claims: sub = user id, role = vai trò)."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Phiên đăng nhập đã hết hạn.") from None
    except jwt.PyJWTError:
        raise _unauthorized("Token không hợp lệ.") from None

    user_id = payload.get("sub") or payload.get("user_id")
    if user_id is None:
        raise _unauthorized("Token không chứa mã người dùng.")
    return RequestIdentity(
        is_authenticated=True,
        user_id=str(user_id),
        user_role=str(payload.get("role", "USER")),
    )


def resolve_identity(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_guest_id: Optional[str] = Header(None, alias="X-Guest-Id"),
) -> RequestIdentity:
    """
    Xác định người gọi:
    1. Có `Authorization: Bearer <JWT>` -> xác thực token (sai hoặc hết hạn trả 401).
    2. Nếu AUTH_DEV_MODE bật, chấp nhận header tự khai X-User-Id (chỉ để phát triển/demo).
    3. Còn lại là khách, định danh bằng X-Guest-Id.
    """
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token.strip():
            raise _unauthorized("Header Authorization phải có dạng 'Bearer <token>'.")
        return _identity_from_token(token.strip())

    if settings.AUTH_DEV_MODE and x_user_id and x_user_id.strip():
        return RequestIdentity(
            is_authenticated=True,
            user_id=x_user_id.strip(),
            user_role=(x_user_role or "USER").strip(),
        )

    return RequestIdentity(
        is_authenticated=False,
        guest_id=(x_guest_id or "default-guest").strip(),
    )


def get_guest_usage(guest_id: str) -> Tuple[int, int, int]:
    """
    Returns (used, remaining, daily_limit) for a guest today.
    The quota is shared by chatbot questions and weekly meal plan generations.
    """
    limit = settings.GUEST_DAILY_LIMIT
    used = quota.get_used(guest_id, get_today())
    return used, max(0, limit - used), limit


def reserve_guest_question(guest_id: str) -> Optional[int]:
    """
    Atomically reserves one turn for today before the AI call (stored in the database,
    so concurrent requests and multiple workers cannot exceed the limit).
    Returns remaining turns after the reservation, or None if the daily limit is used up.
    """
    limit = settings.GUEST_DAILY_LIMIT
    used = quota.reserve(guest_id, get_today(), limit)
    return None if used is None else max(0, limit - used)


def release_guest_question(guest_id: str) -> None:
    """Refunds one reserved turn (e.g. when the AI provider failed)."""
    quota.release(guest_id, get_today())


def reset_guest_usage_for_tests() -> None:
    """Utility to reset the guest quota during automated tests."""
    quota.clear_for_tests()
