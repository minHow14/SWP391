import os
import tempfile
from pathlib import Path

# Đặt trước khi import app: test dùng SQLite tạm, không đụng PostgreSQL / ai_agent.db của dev
# và không phụ thuộc vào file .env.
_TEST_DIR = Path(tempfile.mkdtemp(prefix="ai_service_tests_"))
# PG_TEST_DATABASE_URL: chạy cùng bộ test trên PostgreSQL thật (xem vegetarian_db_schema.sql)
os.environ["DATABASE_URL"] = os.environ.get("PG_TEST_DATABASE_URL") or f"sqlite:///{(_TEST_DIR / 'test.db').as_posix()}"
os.environ["SQLITE_FALLBACK_PATH"] = str(_TEST_DIR / "fallback.db")
os.environ["RATE_LIMIT"] = "100000/minute"
os.environ["DEBUG"] = "false"
os.environ["AUTH_DEV_MODE"] = "true"
os.environ["GUEST_DAILY_LIMIT"] = "3"
# TestClient gọi từ host "testclient": coi như proxy tin cậy để test được X-Forwarded-For
os.environ["TRUSTED_PROXIES"] = "testclient"
