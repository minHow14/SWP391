# ai_service/core/activity_log.py
"""Log vận hành cục bộ; backend sở hữu việc lưu nhật ký nghiệp vụ vào database."""
import logging

logger = logging.getLogger(__name__)


async def record_ai_log(
    model_name: str | None, action: str, status: str,
    error_feedback: str | None = None,
) -> None:
    """Không ghi lỗi gốc để tránh đưa nội dung prompt hoặc khóa provider vào log."""
    logger.info(
        "AI activity model=%s action=%s status=%s hasError=%s",
        model_name or "system", action, status, bool(error_feedback),
    )
