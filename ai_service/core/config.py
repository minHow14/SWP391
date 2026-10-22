# ai_service/core/config.py
from pathlib import Path
from typing import Annotated

from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
from pydantic import field_validator

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Cấu hình AI Microservice đọc từ biến môi trường / file .env."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Khóa xác thực nội bộ bắt buộc Backend Node.js gửi kèm header X-Internal-Api-Key
    INTERNAL_API_KEY: str = "chayxanh_internal_secure_key_2026"

    # DeepSeek: chatbot hỏi đáp và sinh thực đơn tuần
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL: str = "deepseek-chat"
    DEEPSEEK_FALLBACK_MODEL: str = "deepseek-v4-pro"

    DEBUG: bool = False
    SECRET_KEY: str = "dev-secret-key-vegetarian-ai-service-change-me-in-env"
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"

    ALLOWED_ORIGINS: Annotated[list[str], NoDecode] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5000"]
    TRUSTED_PROXIES: Annotated[list[str], NoDecode] = ["127.0.0.1", "::1"]

    RATE_LIMIT: str = "30/minute"

    @field_validator("ALLOWED_ORIGINS", "TRUSTED_PROXIES", mode="before")
    @classmethod
    def split_comma_list(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def jwt_secret(self) -> str:
        return self.JWT_SECRET or self.SECRET_KEY


settings = Settings()
