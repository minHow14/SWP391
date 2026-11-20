# D:/SWP391/SWP391/ai_service/tests/test_errors.py
# ai_service/tests/test_errors.py
# Kiểm thử định dạng lỗi chuẩn (error envelope) của AI Service theo hợp đồng API chung.
from unittest.mock import patch

from fastapi.testclient import TestClient

from core.config import settings
from main import app

# Tắt raise_server_exceptions để kiểm tra response lỗi thật mà client nhận được.
client = TestClient(app, raise_server_exceptions=False)


# Hàm hỗ trợ: kiểm tra response lỗi đúng status, errorCode và có requestId bắt đầu bằng 'req_'.
def assert_error_envelope(res, expected_status: int, expected_code: str):
    assert res.status_code == expected_status
    body = res.json()
    assert body["success"] is False
    assert body["errorCode"] == expected_code
    assert "requestId" in body["meta"]
    assert body["meta"]["requestId"].startswith("req_")


# Payload sai schema -> 422 INVALID_INPUT theo envelope chuẩn.
def test_validation_error_returns_422_envelope():
    """Gửi payload không đúng schema -> 422 INVALID_INPUT."""
    headers = {"X-Internal-Api-Key": settings.INTERNAL_API_KEY}
    res = client.post("/api/chat", json={}, headers=headers)
    assert_error_envelope(res, 422, "INVALID_INPUT")


# Lỗi LLM -> 502 và không được lộ thông điệp lỗi nội bộ ra response.
def test_llm_failure_returns_502_envelope():
    """Khi LLM gặp sự cố -> Trả về 502 AI_PROVIDER_ERROR theo chuẩn bảo mật."""
    headers = {"X-Internal-Api-Key": settings.INTERNAL_API_KEY}
    with patch("api.chat.chatbot_agent.answer", side_effect=RuntimeError("internal llm crash detail")):
        res = client.post("/api/chat", json={"message": "hi"}, headers=headers)
    assert_error_envelope(res, 502, "AI_PROVIDER_ERROR")
    assert "internal llm crash detail" not in res.text
