# D:/SWP391/SWP391/ai_service/core/config.py
# ai_service/core/config.py
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

from core.internal_api_key import (
    MAX_KEY_LENGTH,
    MIN_KEY_LENGTH,
    is_valid_internal_api_key,
)

BASE_DIR = Path(__file__).resolve().parent.parent


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
    INTERNAL_API_KEY: str = Field(min_length=MIN_KEY_LENGTH, max_length=MAX_KEY_LENGTH, repr=False)

    @field_validator("INTERNAL_API_KEY")
    @classmethod
    def validate_internal_api_key(cls, value: str) -> str:
        if not is_valid_internal_api_key(value):
            raise ValueError("INTERNAL_API_KEY must use printable ASCII characters without whitespace.")
        return value

    # DeepSeek: chatbot hỏi đáp và sinh thực đơn tuần
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL: str = "deepseek-chat"
    DEEPSEEK_FALLBACK_MODEL: str = "deepseek-v4-pro"

    DEBUG: bool = False

    ALLOWED_ORIGINS: Annotated[list[str], NoDecode] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5000"]
    TRUSTED_PROXIES: Annotated[list[str], NoDecode] = ["127.0.0.1", "::1"]

    RATE_LIMIT: str = "30/minute"

    @field_validator("ALLOWED_ORIGINS", "TRUSTED_PROXIES", mode="before")
    @classmethod
    def split_comma_list(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

settings = Settings()
