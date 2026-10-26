# D:/SWP391/SWP391/ai_service/core/video_recipe_errors.py
from dataclasses import dataclass


@dataclass
class VideoRecipeError(Exception):
    """A safe failure that can cross the internal API without provider details."""

    code: str
    message: str
    status: int = 422
    retry_after_ms: int = 0

    def __str__(self) -> str:
        return self.message

    def envelope(self) -> dict:
        return {"success": False, "message": self.message, "errorCode": self.code,
                "errors": [], "retryAfterMs": self.retry_after_ms}
