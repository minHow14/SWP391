# ai_service/tests/conftest.py
# ai_service/tests/conftest.py
import os
import secrets

import pytest
from fastapi.testclient import TestClient

# Cấu hình biến môi trường kiểm thử cho AI Microservice (Stateless)
TEST_INTERNAL_API_KEY = secrets.token_hex(32)
os.environ["INTERNAL_API_KEY"] = TEST_INTERNAL_API_KEY
os.environ["RATE_LIMIT"] = "100000/minute"
os.environ["DEBUG"] = "false"
os.environ["TRUSTED_PROXIES"] = "testclient,127.0.0.1"
os.environ.setdefault("DEEPSEEK_API_KEY", "test-deepseek-ci-key")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-ci-key")

from main import app


@pytest.fixture
def internal_headers() -> dict[str, str]:
    return {"X-Internal-Api-Key": TEST_INTERNAL_API_KEY}


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
