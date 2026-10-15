import logging
import threading
import time
from datetime import datetime
from typing import Callable, Optional, TypeVar

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Engine,
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
from starlette.concurrency import run_in_threadpool

from core.config import settings
from core.timezone import VN_TZ

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Sau khi PostgreSQL lỗi, dùng SQLite cục bộ trong khoảng này rồi mới thử lại PostgreSQL.
PRIMARY_RETRY_SECONDS = 30

metadata = MetaData()

# Bảng log AI của nhóm (Prisma model ai_logs): model_name và action là varchar(100) bắt buộc, status là
# chuỗi SUCCESS | ERROR. Bản SQLite chỉ dùng khi không kết nối được PostgreSQL.
AI_LOG_TEXT_LENGTH = 100

ai_log = Table(
    "ai_logs",
    metadata,
    Column("log_id", Integer, primary_key=True, autoincrement=True),
    Column("model_name", String(AI_LOG_TEXT_LENGTH), nullable=False),
    Column("action", String(AI_LOG_TEXT_LENGTH), nullable=False),
    Column("status", String(20), nullable=False),
    Column("error_feedback", Text, nullable=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

# Hạn mức dùng AI trong ngày của khách (Prisma model GuestQuota, bảng guest_quota).
guest_quota = Table(
    "guest_quota",
    metadata,
    Column("guest_id", String(100), primary_key=True),
    Column("quota_date", Date, primary_key=True),
    Column("used_count", Integer, nullable=False, server_default="0"),
    Column("updated_at", DateTime, nullable=False, server_default=func.now()),
)

_primary: Optional[Engine] = None
_fallback: Optional[Engine] = None
_primary_disabled_until = 0.0
_init_lock = threading.Lock()  # các lệnh database chạy trong threadpool


def _sqlite_url() -> str:
    return f"sqlite:///{settings.SQLITE_FALLBACK_PATH}"


def init_db() -> None:
    """Tạo engine (lười, chưa kết nối) và các bảng của bản SQLite dự phòng."""
    if _primary is not None:
        return
    with _init_lock:
        if _primary is None:
            _create_engines()


def _create_engines() -> None:
    global _primary, _fallback
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


def _write_ai_log(
    model_name: Optional[str],
    action: str,
    status: str,
    error_feedback: Optional[str] = None,
) -> None:
    try:
        run_with_fallback(
            lambda conn: conn.execute(
                insert(ai_log).values(
                    # Cột bắt buộc và giới hạn 100 ký tự: không để giá trị rỗng/quá dài làm mất cả dòng log
                    model_name=(model_name or "system")[:AI_LOG_TEXT_LENGTH],
                    action=action[:AI_LOG_TEXT_LENGTH],
                    status=status,
                    error_feedback=error_feedback,
                    # Giờ Việt Nam để khớp cách lọc theo ngày của trang Admin
                    created_at=datetime.now(VN_TZ),
                )
            )
        )
    except Exception as e:
        logger.debug(f"AILog write notice: {e}")


async def record_ai_log(
    model_name: Optional[str],
    action: str,
    status: str,
    error_feedback: Optional[str] = None,
) -> None:
    """
    Ghi một dòng vào AILog (PostgreSQL, hoặc SQLite dự phòng) trong threadpool. Không bao giờ
    ném lỗi để sự cố database không làm hỏng câu trả lời của chatbot.
    """
    await run_in_threadpool(_write_ai_log, model_name, action, status, error_feedback)
