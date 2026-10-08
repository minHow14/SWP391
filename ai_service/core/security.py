from datetime import datetime, timezone
from typing import Optional, Tuple
from fastapi import Header
from pydantic import BaseModel
from core.config import settings

class RequestIdentity(BaseModel):
    is_authenticated: bool
    user_id: Optional[str] = None
    user_role: Optional[str] = None
    guest_id: Optional[str] = None

# In-memory storage for development/demo guest usage tracking.
# Format: {(guest_id, "YYYY-MM-DD"): count}
_guest_usage_store: dict[tuple[str, str], int] = {}

def get_today_str() -> str:
    """Returns today's date in YYYY-MM-DD format."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def resolve_identity(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_guest_id: Optional[str] = Header(None, alias="X-Guest-Id"),
) -> RequestIdentity:
    """
    Development identity resolution using custom HTTP headers.
    NOTE: This is strictly for university/demo development and not production security.
    """
    if x_user_id and x_user_id.strip():
        return RequestIdentity(
            is_authenticated=True,
            user_id=x_user_id.strip(),
            user_role=(x_user_role or "USER").strip(),
            guest_id=None,
        )

    effective_guest_id = (x_guest_id or "default-guest").strip()
    return RequestIdentity(
        is_authenticated=False,
        user_id=None,
        user_role=None,
        guest_id=effective_guest_id,
    )

def get_guest_usage(guest_id: str) -> Tuple[int, int, int]:
    """
    Returns (used_questions, remaining_questions, daily_limit) for a given guest_id today.
    """
    limit = settings.GUEST_DAILY_LIMIT
    today = get_today_str()
    used = _guest_usage_store.get((guest_id, today), 0)
    remaining = max(0, limit - used)
    return used, remaining, limit

def can_guest_ask(guest_id: str) -> bool:
    """Checks if a guest has any questions remaining for today."""
    _, remaining, _ = get_guest_usage(guest_id)
    return remaining > 0

def increment_guest_usage(guest_id: str) -> int:
    """
    Increments the question count for today and returns remaining questions.
    """
    today = get_today_str()
    key = (guest_id, today)
    current = _guest_usage_store.get(key, 0)
    _guest_usage_store[key] = current + 1
    _, remaining, _ = get_guest_usage(guest_id)
    return remaining

def reset_guest_usage_for_tests() -> None:
    """Utility to reset usage store during automated tests."""
    _guest_usage_store.clear()
