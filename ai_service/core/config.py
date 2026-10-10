from pathlib import Path
from typing import Annotated
from urllib.parse import quote_plus

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
from pydantic import field_validator

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Cấu hình đọc từ biến môi trường / file .env (xem .env.example)."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # DeepSeek: chatbot hỏi đáp (và thực đơn nếu chưa có khoá Gemini)
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL: str = "deepseek-chat"

    # Gemini: câu trả lời JSON có cấu trúc (thực đơn tuần). Để trống thì dùng DeepSeek.
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_THINKING_BUDGET: int = 0  # 0 = tắt suy nghĩ (nhanh, JSON không bị cụt)

    # Database: dùng DATABASE_URL nếu có, ngược lại ghép từ các biến DB_*
    DATABASE_URL_OVERRIDE: str = Field("", validation_alias="DATABASE_URL")
    DB_NAME: str = "vegetarian_db"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "12345"
    DB_HOST: str = "localhost"
    DB_PORT: str = "5432"
    SQLITE_FALLBACK_PATH: Path = BASE_DIR / "ai_agent.db"

    DEBUG: bool = False
    SECRET_KEY: str = "dev-secret-key-vegetarian-ai-service-change-me-in-env"
    JWT_SECRET: str = ""  # trống thì dùng SECRET_KEY; phải trùng khoá backend Core dùng để ký JWT
    JWT_ALGORITHM: str = "HS256"
    AUTH_DEV_MODE: bool = True  # cho phép nhận danh tính qua header X-User-Id (chỉ để phát triển)

    ALLOWED_ORIGINS: Annotated[list[str], NoDecode] = ["http://localhost:3000", "http://localhost:5173"]

    # Hạn mức chung của khách mỗi ngày: câu hỏi chatbot + lần tạo thực đơn tuần
    GUEST_DAILY_LIMIT: int = 3
    # Giới hạn tần suất theo IP (chống spam), cú pháp của slowapi, ví dụ "30/minute"
    RATE_LIMIT: str = "30/minute"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def split_origins(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        if self.DATABASE_URL_OVERRIDE.strip():
            return self.DATABASE_URL_OVERRIDE.strip()
        encoded_pwd = quote_plus(self.DB_PASSWORD)
        return f"postgresql+psycopg://{self.DB_USER}:{encoded_pwd}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def jwt_secret(self) -> str:
        return self.JWT_SECRET or self.SECRET_KEY


settings = Settings()
