import logging
import time
from typing import Callable, Optional, TypeVar

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Engine,
    Enum,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    create_engine,
    func,
    insert,
)
from sqlalchemy.engine import Connection
from sqlalchemy.exc import SQLAlchemyError

from core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Sau khi PostgreSQL lỗi, dùng SQLite cục bộ trong khoảng này rồi mới thử lại PostgreSQL.
PRIMARY_RETRY_SECONDS = 30

metadata = MetaData()

# Bảng AILog đã có trong PostgreSQL của nhóm (xem ERD); bản SQLite chỉ dùng khi không kết nối được.
ai_log = Table(
    "ailog",
    metadata,
    Column("log_id", Integer, primary_key=True, autoincrement=True),
    Column("model_name", String(255), nullable=True),
    Column("action", String(255), nullable=True),
    Column("status", Enum("SUCCESS", "ERROR", name="ai_log_status", create_type=False), nullable=False),
    Column("error_feedback", Text, nullable=True),
    Column("created_at", DateTime, server_default=func.now()),
)

# Hạn mức dùng AI trong ngày của khách; schema PostgreSQL ở sql/guest_quota.sql.
guest_quota = Table(
    "guestquota",
    metadata,
    Column("guest_id", String(100), primary_key=True),
    Column("quota_date", Date, primary_key=True),
    Column("used_count", Integer, nullable=False, server_default="0"),
    Column("updated_at", DateTime, nullable=False, server_default=func.now()),
)

_primary: Optional[Engine] = None
_fallback: Optional[Engine] = None
_primary_disabled_until = 0.0


def _sqlite_url() -> str:
    return f"sqlite:///{settings.SQLITE_FALLBACK_PATH}"


def init_db() -> None:
    """Tạo engine (lười, chưa kết nối) và các bảng của bản SQLite dự phòng."""
    global _primary, _fallback
    if _primary is not None:
        return
    url = settings.DATABASE_URL
    if url.startswith("sqlite"):
        _primary = create_engine(url)
        _fallback = None
    else:
        _primary = create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 3})
        _fallback = create_engine(_sqlite_url())
    sqlite_engine = _fallback or _primary
    metadata.create_all(sqlite_engine)


def run_with_fallback(operation: Callable[[Connection], T]) -> T:
    """
    Chạy `operation(conn)` trong một transaction trên PostgreSQL. Nếu PostgreSQL không dùng được
    (mất kết nối, chưa có bảng) thì chạy trên SQLite cục bộ và thử lại PostgreSQL sau một lúc.
    """
    global _primary_disabled_until
    init_db()
    if _fallback is None:
        with _primary.begin() as conn:
            return operation(conn)

    if time.monotonic() >= _primary_disabled_until:
        try:
            with _primary.begin() as conn:
                return operation(conn)
        except SQLAlchemyError as e:
            _primary_disabled_until = time.monotonic() + PRIMARY_RETRY_SECONDS
            logger.warning(f"PostgreSQL unavailable, using local SQLite ({e.__class__.__name__})")

    with _fallback.begin() as conn:
        return operation(conn)


def reset_for_tests() -> None:
    """Đưa trạng thái kết nối về ban đầu (dùng trong test)."""
    global _primary, _fallback, _primary_disabled_until
    for engine in (_primary, _fallback):
        if engine is not None:
            engine.dispose()
    _primary = _fallback = None
    _primary_disabled_until = 0.0


def record_ai_log(
    model_name: Optional[str],
    action: str,
    status: str,
    error_feedback: Optional[str] = None,
) -> None:
    """
    Ghi một dòng vào AILog (PostgreSQL, hoặc SQLite dự phòng). Không bao giờ ném lỗi
    để sự cố database không làm hỏng câu trả lời của chatbot.
    """
    try:
        run_with_fallback(
            lambda conn: conn.execute(
                insert(ai_log).values(
                    model_name=model_name,
                    action=action,
                    status=status,
                    error_feedback=error_feedback,
                )
            )
        )
    except Exception as e:
        logger.debug(f"AILog write notice: {e}")
