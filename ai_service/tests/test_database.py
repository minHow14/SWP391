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
    import asyncio

    asyncio.run(database.record_ai_log("model", "ACTION", "SUCCESS"))
    asyncio.run(database.record_ai_log("model", "ACTION", "NOT_A_STATUS"))


def test_quota_and_log_calls_run_off_the_event_loop_thread():
    import asyncio
    import threading
    from unittest.mock import patch

    from core.security import get_guest_usage, release_guest_question, reserve_guest_question

    seen = []

    def record_thread(*args, **kwargs):
        seen.append(threading.current_thread() is threading.main_thread())
        return 0

    async def scenario():
        with patch("core.quota.reserve", side_effect=record_thread), \
             patch("core.quota.release", side_effect=record_thread), \
             patch("core.quota.get_used", side_effect=record_thread), \
             patch("core.database._write_ai_log", side_effect=record_thread):
            await reserve_guest_question("thread-guest")
            await release_guest_question("thread-guest")
            await get_guest_usage("thread-guest")
            await database.record_ai_log("m", "A", "SUCCESS")

    asyncio.run(scenario())
    assert seen == [False, False, False, False]
