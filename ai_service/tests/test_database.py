import pytest

from core import database, quota
from core.config import settings
from core.security import get_today, reset_guest_usage_for_tests


@pytest.fixture
def unreachable_postgres(monkeypatch):
    """PostgreSQL không kết nối được -> phải dùng SQLite dự phòng."""
    monkeypatch.setattr(settings, "DATABASE_URL_OVERRIDE", "postgresql+psycopg://u:p@127.0.0.1:1/none")
    database.reset_for_tests()
    yield
    database.reset_for_tests()
    reset_guest_usage_for_tests()


def test_quota_reserve_stops_at_limit_and_release_refunds():
    today = get_today()
    assert [quota.reserve("db-guest", today, 2) for _ in range(3)] == [1, 2, None]
    assert quota.get_used("db-guest", today) == 2
    quota.release("db-guest", today)
    assert quota.get_used("db-guest", today) == 1
    assert quota.reserve("db-guest", today, 2) == 2


def test_quota_is_tracked_per_guest_and_per_day():
    from datetime import timedelta

    today = get_today()
    assert quota.reserve("guest-a", today, 1) == 1
    assert quota.reserve("guest-b", today, 1) == 1
    assert quota.reserve("guest-a", today + timedelta(days=1), 1) == 1
    assert quota.reserve("guest-a", today, 1) is None


def test_release_never_goes_below_zero():
    today = get_today()
    quota.release("never-used", today)
    assert quota.get_used("never-used", today) == 0


def test_falls_back_to_sqlite_when_postgres_is_down(unreachable_postgres):
    today = get_today()
    assert quota.reserve("fallback-guest", today, 3) == 1
    assert quota.reserve("fallback-guest", today, 3) == 2
    assert quota.get_used("fallback-guest", today) == 2


def test_record_ai_log_never_raises(unreachable_postgres):
    database.record_ai_log("model", "ACTION", "SUCCESS")
    database.record_ai_log("model", "ACTION", "NOT_A_STATUS")
