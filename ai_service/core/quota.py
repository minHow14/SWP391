from datetime import date
from typing import Optional

from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.engine import Connection

from core.database import guest_quota, run_with_fallback


def _upsert(conn: Connection):
    return (pg_insert if conn.dialect.name == "postgresql" else sqlite_insert)(guest_quota)


def reserve(guest_id: str, day: date, limit: int) -> Optional[int]:
    """
    Giữ một lượt bằng một câu upsert nguyên tử: chỉ tăng khi used_count còn dưới hạn mức, nên
    nhiều request hoặc nhiều worker cùng lúc cũng không vượt được.
    Trả về số lượt đã dùng sau khi giữ, hoặc None nếu đã hết lượt.
    """
    def operation(conn: Connection) -> Optional[int]:
        stmt = _upsert(conn).values(guest_id=guest_id, quota_date=day, used_count=1)
        stmt = stmt.on_conflict_do_update(
            index_elements=[guest_quota.c.guest_id, guest_quota.c.quota_date],
            set_={"used_count": guest_quota.c.used_count + 1, "updated_at": func.now()},
            where=guest_quota.c.used_count < limit,
        ).returning(guest_quota.c.used_count)
        return conn.execute(stmt).scalar()

    return run_with_fallback(operation)


def release(guest_id: str, day: date) -> None:
    """Hoàn một lượt đã giữ."""
    run_with_fallback(
        lambda conn: conn.execute(
            update(guest_quota)
            .where(
                guest_quota.c.guest_id == guest_id,
                guest_quota.c.quota_date == day,
                guest_quota.c.used_count > 0,
            )
            .values(used_count=guest_quota.c.used_count - 1, updated_at=func.now())
        )
    )


def get_used(guest_id: str, day: date) -> int:
    return run_with_fallback(
        lambda conn: conn.execute(
            select(guest_quota.c.used_count).where(
                guest_quota.c.guest_id == guest_id, guest_quota.c.quota_date == day
            )
        ).scalar()
    ) or 0


def clear_for_tests() -> None:
    run_with_fallback(lambda conn: conn.execute(delete(guest_quota)))
