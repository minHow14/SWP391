import logging
from typing import Generator, Optional
from sqlalchemy import create_engine, Column, Integer, String, Text, Enum
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from core.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

class AILog(Base):
    """
    Represents the existing AILog table in PostgreSQL.
    Schema source of truth:
      - log_id: INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY
      - model_name: VARCHAR(255)
      - action: VARCHAR(255)
      - status: ai_log_status ('SUCCESS', 'ERROR')
      - error_feedback: TEXT
    """
    __tablename__ = "ailog"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(255), nullable=True)
    action = Column(String(255), nullable=True)
    status = Column(Enum("SUCCESS", "ERROR", name="ai_log_status"), nullable=False)
    error_feedback = Column(Text, nullable=True)


engine = None
SessionLocal = None

def init_db():
    global engine, SessionLocal
    if engine is None and settings.DATABASE_URL:
        try:
            engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        except Exception as e:
            logger.warning(f"Failed to initialize database connection: {e}")

def get_db() -> Generator[Optional[Session], None, None]:
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
    error_feedback: Optional[str] = None
) -> None:
    """
    Safely writes an entry to the existing AILog table.
    Fails gracefully so that database issues never break chatbot responses.
    """
    try:
        init_db()
        if SessionLocal is None:
            return
        with SessionLocal() as session:
            entry = AILog(
                model_name=model_name,
                action=action,
                status=status,
                error_feedback=error_feedback
            )
            session.add(entry)
            session.commit()
    except Exception as e:
        logger.warning(f"Unable to write to AILog: {e}")
