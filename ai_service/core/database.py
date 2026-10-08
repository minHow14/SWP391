import logging
import sqlite3
from pathlib import Path
from typing import Generator, Optional, Any
from core.config import settings

logger = logging.getLogger(__name__)

# Local SQLite fallback path
LOCAL_DB_PATH = Path(__file__).resolve().parent.parent / "ai_agent.db"

# Try optional SQLAlchemy imports
try:
    from sqlalchemy import create_engine, Column, Integer, String, Text, Enum
    from sqlalchemy.orm import declarative_base, sessionmaker, Session
    Base = declarative_base()

    class AILog(Base):
        """
        Represents the existing AILog table in PostgreSQL.
        """
        __tablename__ = "ailog"

        log_id = Column(Integer, primary_key=True, autoincrement=True)
        model_name = Column(String(255), nullable=True)
        action = Column(String(255), nullable=True)
        status = Column(Enum("SUCCESS", "ERROR", name="ai_log_status"), nullable=False)
        error_feedback = Column(Text, nullable=True)
except Exception:
    create_engine = None
    Base = None
    AILog = None
    sessionmaker = None
    Session = None

engine = None
SessionLocal = None


def _init_sqlite_fallback():
    """Initializes a local SQLite table if PostgreSQL is unavailable."""
    try:
        with sqlite3.connect(LOCAL_DB_PATH) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ailog (
                    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    model_name TEXT,
                    action TEXT,
                    status TEXT,
                    error_feedback TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
    except Exception as e:
        logger.debug(f"SQLite fallback initialization notice: {e}")


def init_db():
    global engine, SessionLocal
    if engine is None and create_engine is not None and settings.DATABASE_URL:
        try:
            engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        except Exception:
            engine = None
            SessionLocal = None
            _init_sqlite_fallback()
    elif SessionLocal is None:
        _init_sqlite_fallback()


def get_db() -> Generator[Optional[Any], None, None]:
    init_db()
    if SessionLocal is None:
        yield None
        return
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def record_ai_log(
    model_name: Optional[str],
    action: str,
    status: str,
    error_feedback: Optional[str] = None,
) -> None:
    """
    Safely writes an entry to the AILog table in PostgreSQL or local SQLite fallback.
    Fails gracefully so that database issues never break chatbot responses.
    """
    try:
        init_db()
        # 1. Try PostgreSQL via SQLAlchemy if available
        if SessionLocal is not None and AILog is not None:
            with SessionLocal() as session:
                entry = AILog(
                    model_name=model_name,
                    action=action,
                    status=status,
                    error_feedback=error_feedback,
                )
                session.add(entry)
                session.commit()
                return

        # 2. Otherwise write to local SQLite fallback
        with sqlite3.connect(LOCAL_DB_PATH) as conn:
            conn.execute(
                """
                INSERT INTO ailog (model_name, action, status, error_feedback)
                VALUES (?, ?, ?, ?)
                """,
                (model_name, action, status, error_feedback),
            )
            conn.commit()
    except Exception as e:
        logger.debug(f"AILog write notice: {e}")
