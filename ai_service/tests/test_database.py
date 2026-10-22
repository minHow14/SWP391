# ai_service/tests/test_database.py
import pytest
from core.database import init_db, record_ai_log


def test_init_db_stateless():
    """Kiểm tra khởi tạo database ở chế độ Stateless (không throw lỗi)."""
    init_db()  # Không được ném exception


@pytest.mark.asyncio
async def test_record_ai_log_stateless():
    """Kiểm tra ghi log AI trong môi trường stateless."""
    await record_ai_log(
        model_name="deepseek-chat",
        action="TEST_ACTION",
        status="SUCCESS",
        error_feedback=None,
    )
    # Ghi nhận log lỗi
    await record_ai_log(
        model_name="deepseek-chat",
        action="TEST_ERROR",
        status="ERROR",
        error_feedback="Chi tiết lỗi thử nghiệm",
    )
