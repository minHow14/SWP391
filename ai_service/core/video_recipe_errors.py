# D:/SWP391/SWP391/ai_service/core/video_recipe_errors.py
# Kiểu lỗi nghiệp vụ của tính năng công thức video, có thể trả thẳng cho Backend mà không lộ chi tiết nhà cung cấp.
from dataclasses import dataclass


# Lỗi an toàn: chỉ chứa mã lỗi, thông điệp thân thiện, HTTP status và thời gian gợi ý thử lại.
@dataclass
class VideoRecipeError(Exception):
    """A safe failure that can cross the internal API without provider details."""

    code: str
    message: str
    status: int = 422
    retry_after_ms: int = 0

    # Trả về thông điệp thân thiện khi in lỗi.
    def __str__(self) -> str:
        return self.message

    # Dựng body lỗi theo API Contract, kèm retryAfterMs để Backend biết khi nào nên thử lại.
    def envelope(self) -> dict:
        return {
            "success": False,
            "message": self.message,
            "errorCode": self.code,
            "errors": [],
            "retryAfterMs": self.retry_after_ms,
        }
