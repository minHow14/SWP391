from urllib.parse import quote_plus
from pathlib import Path
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(BASE_DIR / ".env")
load_dotenv()

class Settings:
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    # Gemini phụ trách các câu trả lời có cấu trúc JSON (thực đơn tuần). Để trống GEMINI_API_KEY
    # thì quay về dùng DeepSeek. Gọi qua endpoint tương thích OpenAI của Google nên không cần thêm thư viện.
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_BASE_URL: str = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
    
    # Database configuration (support individual DB_* variables or direct DATABASE_URL)
    DB_NAME: str = os.getenv("DB_NAME", "vegetarian_db")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "12345")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")

    @property
    def DATABASE_URL(self) -> str:
        explicit_url = os.getenv("DATABASE_URL")
        if explicit_url and explicit_url.strip():
            return explicit_url.strip()
        encoded_pwd = quote_plus(self.DB_PASSWORD)
        return f"postgresql+psycopg://{self.DB_USER}:{encoded_pwd}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-vegetarian-ai")
    AUTH_DEV_MODE: bool = os.getenv("AUTH_DEV_MODE", "true").lower() in ("true", "1", "yes")
    
    _origins_str: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
    ALLOWED_ORIGINS: list[str] = [origin.strip() for origin in _origins_str.split(",") if origin.strip()]
    
    # Shared daily quota for guests: chatbot questions + meal plan generations
    GUEST_DAILY_LIMIT: int = int(os.getenv("GUEST_DAILY_LIMIT", "3"))

settings = Settings()
