# ai_service/core/database.py
"""
AI Microservice tuân thủ nguyên tắc cô lập (Isolation):
Tuyệt đối KHÔNG kết nối trực tiếp vào cơ sở dữ liệu PostgreSQL.
Mọi dữ liệu nghiệp vụ, hạn mức và nhật ký do Backend Node.js điều phối.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def init_db() -> None:
    """Hàm khởi tạo không can thiệp cơ sở dữ liệu (stateless service)."""
    logger.info("AI Service running in stateless microservice mode (no direct DB connection).")


async def record_ai_log(
    model_name: Optional[str],
    action: str,
    status: str,
    error_feedback: Optional[str] = None,
) -> None:
    """Ghi log có cấu trúc trên tiến trình dịch vụ AI (không ghi DB trực tiếp)."""
    logger.info(
        f"[AI Activity Log] model={model_name or 'system'} action={action} status={status} error={error_feedback}"
    )
