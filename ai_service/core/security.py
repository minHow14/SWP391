from datetime import date, datetime, time, timedelta
from typing import Optional, Tuple

import jwt
from fastapi import Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from core import quota
from core.config import settings
from core.timezone import VN_TZ

MAX_GUEST_ID_LENGTH = 100  # bằng độ dài cột GuestQuota.guest_id


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
        # verify_sub=False: PyJWT >= 2.10 bắt `sub` phải là chuỗi, nhưng backend Node (jsonwebtoken)
        # thường ký `sub` bằng user_id kiểu số. Chữ ký và hạn dùng vẫn được kiểm tra đầy đủ.
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_sub": False},
        )
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
    request: Request,
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_guest_id: Optional[str] = Header(None, alias="X-Guest-Id"),
) -> RequestIdentity:
    """
    Xác định người gọi:
    1. Có `Authorization: Bearer <JWT>` -> xác thực token (sai hoặc hết hạn trả 401).
    2. Nếu AUTH_DEV_MODE bật, chấp nhận header tự khai X-User-Id (chỉ để phát triển/demo).
    3. Còn lại là khách, định danh bằng X-Guest-Id; thiếu header thì theo IP của khách
       (không gộp mọi khách vào chung một hạn mức).
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

    guest_id = (x_guest_id or "").strip()
    if len(guest_id) > MAX_GUEST_ID_LENGTH:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_INPUT",
                "message": f"X-Guest-Id không được dài quá {MAX_GUEST_ID_LENGTH} ký tự.",
            },
        )
    if not guest_id:
        guest_id = f"ip:{request.client.host if request.client else 'unknown'}"
    return RequestIdentity(is_authenticated=False, guest_id=guest_id)


# Giá trị claim `role` / header X-User-Role được coi là Administrator (cột users.role: 1 = Admin)
ADMIN_ROLES = {"1", "admin", "administrator"}


def require_admin(identity: RequestIdentity = Depends(resolve_identity)) -> RequestIdentity:
    """Chỉ cho Administrator đi qua: chưa đăng nhập trả 401, không đủ quyền trả 403."""
    if not identity.is_authenticated:
        raise _unauthorized("Bạn cần đăng nhập bằng tài khoản quản trị.")
    if (identity.user_role or "").strip().lower() not in ADMIN_ROLES:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Bạn không có quyền truy cập chức năng này."},
        )
    return identity


# Các hàm quota gọi database đồng bộ (SQLAlchemy); chạy trong threadpool để không chặn event loop,
# kể cả khi PostgreSQL treo tới hết connect_timeout.

async def get_guest_usage(guest_id: str) -> Tuple[int, int, int]:
    """
    Returns (used, remaining, daily_limit) for a guest today.
    The quota is shared by chatbot questions and weekly meal plan generations.
    """
    limit = settings.GUEST_DAILY_LIMIT
    used = await run_in_threadpool(quota.get_used, guest_id, get_today())
    return used, max(0, limit - used), limit


async def reserve_guest_question(guest_id: str) -> Optional[int]:
    """
    Atomically reserves one turn for today before the AI call (stored in the database,
    so concurrent requests and multiple workers cannot exceed the limit).
    Returns remaining turns after the reservation, or None if the daily limit is used up.
    """
    limit = settings.GUEST_DAILY_LIMIT
    used = await run_in_threadpool(quota.reserve, guest_id, get_today(), limit)
    return None if used is None else max(0, limit - used)


async def release_guest_question(guest_id: str) -> None:
    """Refunds one reserved turn (e.g. when the AI provider failed)."""
    await run_in_threadpool(quota.release, guest_id, get_today())


async def admin_reset_guest_quota(guest_id: str) -> int:
    """Admin xoá hạn mức hôm nay của một khách; trả về số lượt đã dùng trước khi xoá."""
    return await run_in_threadpool(quota.reset, guest_id, get_today())


def reset_guest_usage_for_tests() -> None:
    """Utility to reset the guest quota during automated tests."""
    quota.clear_for_tests()
