# D:/SWP391/SWP391/ai_service/services/video_provider.py
# Tiện ích xử lý giới hạn tần suất từ nhà cung cấp AI cho tính năng công thức video.
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime

import httpx

from core.video_recipe_errors import VideoRecipeError


# Chuyển header Retry-After (số giây hoặc ngày giờ HTTP) thành lỗi 429 kèm thời gian chờ,
# giữ thời gian hồi của nhà cung cấp mà không lộ nội dung phản hồi gốc.
def provider_rate_limit(headers: httpx.Headers) -> VideoRecipeError:
    """Keep provider cooldowns without exposing upstream response content."""
    value = headers.get("retry-after", "0")
    try:
        seconds = (
            float(value)
            if value.replace(".", "", 1).isdigit()
            else (parsedate_to_datetime(value) - datetime.now(UTC)).total_seconds()
        )
    except (TypeError, ValueError, OverflowError):
        seconds = 0
    milliseconds = max(0, int(seconds * 1000))
    # Chặn giá trị vượt số nguyên 32-bit (khoảng 24,8 ngày): coi là phản hồi bất thường thay vì chờ gần như vô hạn.
    if milliseconds > 2_147_483_647:
        raise VideoRecipeError(
            "VIDEO_AI_INVALID_OUTPUT",
            "Thời gian chờ nhà cung cấp không hợp lệ.",
            status=502,
        )
    return VideoRecipeError(
        "VIDEO_AI_RATE_LIMITED",
        "Nhà cung cấp AI đang hết hạn mức. Vui lòng chờ thử lại.",
        status=429,
        retry_after_ms=milliseconds,
    )
