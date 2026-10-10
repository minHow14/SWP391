from datetime import datetime, time, timedelta, timezone
from typing import Optional, Tuple
from fastapi import Header
from pydantic import BaseModel
from core.config import settings
from core import quota

VN_TZ = timezone(timedelta(hours=7))

class RequestIdentity(BaseModel):
    is_authenticated: bool
    user_id: Optional[str] = None
    user_role: Optional[str] = None
    guest_id: Optional[str] = None

def get_today_str() -> str:
    """Returns today's date in YYYY-MM-DD format based on Vietnam timezone (+07:00)."""
    return datetime.now(VN_TZ).strftime("%Y-%m-%d")

def get_quota_reset_iso() -> str:
    """Returns ISO 8601 timestamp for the next midnight reset in Vietnam timezone (+07:00)."""
    now_vn = datetime.now(VN_TZ)
    next_midnight = datetime.combine(
        now_vn.date() + timedelta(days=1),
        time.min,
        tzinfo=VN_TZ,
    )
    return next_midnight.isoformat()

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

# In-memory storage for development/demo guest meal plan usage tracking.
# Format: {(guest_id, "YYYY-MM-DD"): count}
_guest_meal_plan_usage_store: dict[tuple[str, str], int] = {}

def get_guest_usage(guest_id: str) -> Tuple[int, int, int]:
    """
    Returns (used, remaining, daily_limit) for a guest today.
    The quota is shared by chatbot questions and weekly meal plan generations.
    """
    limit = settings.GUEST_DAILY_LIMIT
    used = quota.get_used(guest_id, get_today_str())
    return used, max(0, limit - used), limit

def reserve_guest_question(guest_id: str) -> Optional[int]:
    """
    Atomically reserves one turn for today before the AI call (stored in the database,
    so concurrent requests and multiple workers cannot exceed the limit).
    Returns remaining turns after the reservation, or None if the daily limit is used up.
    """
    limit = settings.GUEST_DAILY_LIMIT
    used = quota.reserve(guest_id, get_today_str(), limit)
    return None if used is None else max(0, limit - used)

def release_guest_question(guest_id: str) -> None:
    """Refunds one reserved turn (e.g. when the AI provider failed)."""
    quota.release(guest_id, get_today_str())

def get_guest_meal_plan_usage(guest_id: str) -> Tuple[int, int, int]:
    """
    Returns (used_plans, remaining_plans, daily_limit) for a given guest_id today.
    """
    limit = settings.GUEST_MEAL_PLAN_LIMIT
    today = get_today_str()
    used = _guest_meal_plan_usage_store.get((guest_id, today), 0)
    remaining = max(0, limit - used)
    return used, remaining, limit

def can_guest_generate_meal_plan(guest_id: str) -> bool:
    """Checks if a guest has any meal plan generations remaining today."""
    _, remaining, _ = get_guest_meal_plan_usage(guest_id)
    return remaining > 0

def increment_guest_meal_plan_usage(guest_id: str) -> int:
    """
    Increments the meal plan count for today and returns remaining generations.
    """
    today = get_today_str()
    key = (guest_id, today)
    current = _guest_meal_plan_usage_store.get(key, 0)
    _guest_meal_plan_usage_store[key] = current + 1
    _, remaining, _ = get_guest_meal_plan_usage(guest_id)
    return remaining

def reset_guest_usage_for_tests() -> None:
    """Utility to reset usage stores during automated tests."""
    quota.clear_for_tests()
    _guest_meal_plan_usage_store.clear()

