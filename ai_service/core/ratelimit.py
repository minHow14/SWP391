# D:/SWP391/SWP391/ai_service/core/ratelimit.py
from slowapi import Limiter
from slowapi.util import get_remote_address

from core.config import settings

# request.client đã được ProxyHeadersMiddleware (main.py) thay bằng IP thật khi đi qua proxy tin cậy
limiter = Limiter(key_func=get_remote_address)


def rate_limit():
    """Decorator giới hạn tần suất theo IP; giá trị đọc từ settings.RATE_LIMIT mỗi lần gọi."""
    return limiter.limit(lambda: settings.RATE_LIMIT)
