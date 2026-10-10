import logging
import sqlite3
import time
from typing import Optional

from core import database
from core.database import LOCAL_DB_PATH

logger = logging.getLogger(__name__)

# Sau khi PostgreSQL lỗi, tạm dùng SQLite cục bộ trong khoảng này rồi thử lại.
PG_RETRY_SECONDS = 30
_pg_disabled_until = 0.0

_SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS GuestQuota (
    guest_id   TEXT NOT NULL,
    quota_date TEXT NOT NULL,
    used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guest_id, quota_date)
)
"""

# Upsert nguyên tử: chỉ tăng khi chưa chạm hạn mức; không trả dòng nào nghĩa là đã hết lượt.
_RESERVE = """
INSERT INTO GuestQuota (guest_id, quota_date, used_count)
VALUES (:guest_id, {date}, 1)
ON CONFLICT (guest_id, quota_date)
DO UPDATE SET used_count = GuestQuota.used_count + 1, updated_at = CURRENT_TIMESTAMP
WHERE GuestQuota.used_count < :limit
RETURNING used_count
"""
_RELEASE = """
UPDATE GuestQuota SET used_count = used_count - 1, updated_at = CURRENT_TIMESTAMP
WHERE guest_id = :guest_id AND quota_date = {date} AND used_count > 0
"""
_USED = "SELECT used_count FROM GuestQuota WHERE guest_id = :guest_id AND quota_date = {date}"

_PG_DATE = "CAST(:day AS DATE)"
_SQLITE_DATE = ":day"


def _run(sql: str, params: dict, fetch: bool):
    """Chạy câu SQL trên PostgreSQL, nếu lỗi thì chạy trên SQLite cục bộ (ai_agent.db)."""
    global _pg_disabled_until
    database.init_db()
    if database.engine is not None and time.monotonic() >= _pg_disabled_until:
        try:
            from sqlalchemy import text

            with database.engine.begin() as conn:
                result = conn.execute(text(sql.format(date=_PG_DATE)), params)
                return result.scalar() if fetch else None
        except Exception as e:
            _pg_disabled_until = time.monotonic() + PG_RETRY_SECONDS
            logger.warning(f"GuestQuota: PostgreSQL unavailable, using local SQLite ({e.__class__.__name__})")

    with sqlite3.connect(LOCAL_DB_PATH, timeout=10) as conn:
        conn.execute(_SQLITE_SCHEMA)
        cursor = conn.execute(sql.format(date=_SQLITE_DATE), params)
        row = cursor.fetchone() if fetch else None
        return row[0] if row else None


def reserve(guest_id: str, day: str, limit: int) -> Optional[int]:
    """Giữ một lượt. Trả về số lượt đã dùng sau khi giữ, hoặc None nếu đã hết hạn mức."""
    return _run(_RESERVE, {"guest_id": guest_id, "day": day, "limit": limit}, fetch=True)


def release(guest_id: str, day: str) -> None:
    """Hoàn một lượt đã giữ."""
    _run(_RELEASE, {"guest_id": guest_id, "day": day}, fetch=False)


def get_used(guest_id: str, day: str) -> int:
    return _run(_USED, {"guest_id": guest_id, "day": day}, fetch=True) or 0


def clear_for_tests() -> None:
    global _pg_disabled_until
    _pg_disabled_until = 0.0
    with sqlite3.connect(LOCAL_DB_PATH, timeout=10) as conn:
        conn.execute(_SQLITE_SCHEMA)
        conn.execute("DELETE FROM GuestQuota")
