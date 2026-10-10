from fastapi import Request
from slowapi import Limiter

from core.config import settings


def client_ip(request: Request) -> str:
    """IP người gọi; ưu tiên X-Forwarded-For khi đứng sau proxy (ví dụ backend Express)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=client_ip)


def rate_limit():
    """Decorator giới hạn tần suất theo IP; giá trị đọc từ settings.RATE_LIMIT mỗi lần gọi."""
    return limiter.limit(lambda: settings.RATE_LIMIT)
