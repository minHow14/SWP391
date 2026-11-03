# D:/SWP391/SWP391/ai_service/services/video_provider.py
import json
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime

import httpx

from core.video_recipe_config import MAX_PROVIDER_RESPONSE_BYTES
from core.video_recipe_errors import VideoRecipeError


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


async def read_provider_json(response: httpx.Response) -> dict:
    """Bound decompressed provider output before JSON parsing."""
    chunks, size = [], 0
    async for chunk in response.aiter_bytes():
        size += len(chunk)
        if size > MAX_PROVIDER_RESPONSE_BYTES:
            raise VideoRecipeError(
                "VIDEO_AI_INVALID_OUTPUT",
                "Phản hồi nhận dạng vượt giới hạn.",
                status=502,
            )
        chunks.append(chunk)
    try:
        value = json.loads(b"".join(chunks))
        if not isinstance(value, dict):
            raise TypeError("Expected an object")
        return value
    except (ValueError, TypeError, UnicodeDecodeError) as failure:
        raise VideoRecipeError(
            "VIDEO_AI_INVALID_OUTPUT", "Phản hồi nhận dạng không hợp lệ.", status=502
        ) from failure
