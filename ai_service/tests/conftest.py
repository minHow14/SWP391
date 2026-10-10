import os
import tempfile
from pathlib import Path

# Đặt trước khi import app: test dùng SQLite tạm, không đụng PostgreSQL / ai_agent.db của dev
# và không phụ thuộc vào file .env.
_TEST_DIR = Path(tempfile.mkdtemp(prefix="ai_service_tests_"))
os.environ["DATABASE_URL"] = f"sqlite:///{(_TEST_DIR / 'test.db').as_posix()}"
os.environ["SQLITE_FALLBACK_PATH"] = str(_TEST_DIR / "fallback.db")
os.environ["RATE_LIMIT"] = "100000/minute"
os.environ["GEMINI_API_KEY"] = ""
os.environ["DEBUG"] = "false"
os.environ["AUTH_DEV_MODE"] = "true"
os.environ["GUEST_DAILY_LIMIT"] = "3"
