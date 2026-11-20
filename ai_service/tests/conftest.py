# D:/SWP391/SWP391/ai_service/tests/conftest.py
# ai_service/tests/conftest.py
# Cấu hình pytest dùng chung cho toàn bộ test của AI Service: nạp biến môi trường kiểm thử
# trước khi import app và cung cấp fixture client/header xác thực nội bộ.
import os
import secrets

import pytest
from fastapi.testclient import TestClient

# Cấu hình biến môi trường kiểm thử cho AI Microservice (Stateless)
# Sinh khoá ngẫu nhiên mỗi lần chạy để không bao giờ phụ thuộc vào khoá thật trong .env.
TEST_INTERNAL_API_KEY = secrets.token_hex(32)
os.environ["INTERNAL_API_KEY"] = TEST_INTERNAL_API_KEY
# Nới rộng rate limit để các test gọi API liên tục không bị trả 429 ngoài ý muốn.
os.environ["RATE_LIMIT"] = "100000/minute"
os.environ["DEBUG"] = "false"
os.environ["TRUSTED_PROXIES"] = "testclient,127.0.0.1"
# Key giả chỉ để khởi tạo client LLM trên CI; mọi lời gọi provider trong test đều được mock.
os.environ.setdefault("DEEPSEEK_API_KEY", "test-deepseek-ci-key")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-ci-key")

# Import app SAU khi đặt biến môi trường vì Settings đọc cấu hình ngay lúc import.
from main import app


# Fixture: header X-Internal-Api-Key hợp lệ, mô phỏng request đã xác thực từ Back-end.
@pytest.fixture
def internal_headers() -> dict[str, str]:
    return {"X-Internal-Api-Key": TEST_INTERNAL_API_KEY}


# Fixture: TestClient gọi trực tiếp vào app FastAPI mà không cần chạy server thật.
@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
