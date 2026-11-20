# D:/SWP391/SWP391/ai_service/core/config.py
# ai_service/core/config.py
# Khai báo và kiểm tra cấu hình AI Service (khóa nội bộ, DeepSeek, CORS, proxy, rate limit)
# đọc từ biến môi trường hoặc file .env.
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

from core.internal_api_key import (
    MAX_KEY_LENGTH,
    MIN_KEY_LENGTH,
    is_valid_internal_api_key,
)

# Thư mục gốc ai_service/, dùng để định vị file .env bất kể thư mục chạy lệnh.
BASE_DIR = Path(__file__).resolve().parent.parent


# Lớp cấu hình trung tâm; hide_input_in_errors ẩn giá trị gốc khi validate lỗi để không lộ khóa bí mật.
class Settings(BaseSettings):
    """Cấu hình AI Microservice đọc từ biến môi trường / file .env."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        hide_input_in_errors=True,
    )

    # Khóa xác thực nội bộ bắt buộc Backend Node.js gửi kèm header X-Internal-Api-Key
    INTERNAL_API_KEY: str = Field(
        min_length=MIN_KEY_LENGTH, max_length=MAX_KEY_LENGTH, repr=False
    )

    # Từ chối khóa nội bộ chứa ký tự ngoài ASCII in được hoặc khoảng trắng (phải khớp định dạng phía Backend).
    @field_validator("INTERNAL_API_KEY")
    @classmethod
    def validate_internal_api_key(cls, value: str) -> str:
        if not is_valid_internal_api_key(value):
            raise ValueError(
                "INTERNAL_API_KEY must use printable ASCII characters without whitespace."
            )
        return value

    # DeepSeek: chatbot hỏi đáp và sinh thực đơn tuần
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL: str = "deepseek-chat"
    DEEPSEEK_FALLBACK_MODEL: str = "deepseek-v4-pro"
    # Thời gian chờ tối đa (giây) khi gọi LLM kiểm duyệt nội dung.
    CONTENT_MODERATION_TIMEOUT_SECONDS: int = Field(default=20, ge=1, le=120)

    # Bật chế độ debug khi phát triển local.
    DEBUG: bool = False

    # NoDecode: tắt việc parse JSON mặc định để cho phép nhập danh sách dạng "a,b,c" trong .env.
    ALLOWED_ORIGINS: Annotated[list[str], NoDecode] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5000",
    ]
    TRUSTED_PROXIES: Annotated[list[str], NoDecode] = ["127.0.0.1", "::1"]

    # Giới hạn tần suất mặc định cho mỗi client (cú pháp của slowapi).
    RATE_LIMIT: str = "30/minute"

    # Tách chuỗi phân tách bằng dấu phẩy thành list, bỏ phần tử rỗng.
    @field_validator("ALLOWED_ORIGINS", "TRUSTED_PROXIES", mode="before")
    @classmethod
    def split_comma_list(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


# Thể hiện cấu hình dùng chung toàn service; khởi tạo sẽ báo lỗi ngay nếu thiếu INTERNAL_API_KEY.
settings = Settings()
