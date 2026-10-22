# ai_service/tests/conftest.py
import os
import pytest
from fastapi.testclient import TestClient

# Cấu hình biến môi trường kiểm thử cho AI Microservice (Stateless)
os.environ["INTERNAL_API_KEY"] = "chayxanh_internal_secure_key_2026"
os.environ["RATE_LIMIT"] = "100000/minute"
os.environ["DEBUG"] = "false"
os.environ["TRUSTED_PROXIES"] = "testclient,127.0.0.1"
os.environ.setdefault("DEEPSEEK_API_KEY", "test-deepseek-ci-key")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-ci-key")

from main import app


@pytest.fixture
def internal_headers() -> dict[str, str]:
    return {"X-Internal-Api-Key": "chayxanh_internal_secure_key_2026"}


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
