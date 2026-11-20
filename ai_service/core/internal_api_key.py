# D:/SWP391/SWP391/ai_service/core/internal_api_key.py
# Quy tắc định dạng khóa nội bộ X-Internal-Api-Key, dùng chung cho cấu hình và kiểm tra request.
import re

# Độ dài khóa tối thiểu/tối đa; tối thiểu 32 ký tự để chống dò khóa bằng vét cạn.
MIN_KEY_LENGTH = 32
MAX_KEY_LENGTH = 256
# Chỉ chấp nhận ký tự ASCII in được (0x21-0x7E), không khoảng trắng, để an toàn khi đặt trong header HTTP.
INVALID_KEY_CHARACTER = re.compile(r"[^\x21-\x7e]")


# Kiểm tra khóa có đúng định dạng không bị biến đổi, an toàn cho header, giống quy tắc phía Backend.
def is_valid_internal_api_key(value: object) -> bool:
    """Use the same unmodified header-safe key format as the backend."""
    return (
        isinstance(value, str)
        and MIN_KEY_LENGTH <= len(value) <= MAX_KEY_LENGTH
        and INVALID_KEY_CHARACTER.search(value) is None
    )
