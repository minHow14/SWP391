# ai_service/tests/test_ratelimit.py
# ai_service/tests/test_ratelimit.py
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from core.config import settings
from main import app

client = TestClient(app)


@patch("api.chat.chatbot_agent.answer", new_callable=AsyncMock)
def test_too_many_requests_from_one_ip_get_429_envelope(mock_answer, monkeypatch):
    mock_answer.return_value = "ok"
    monkeypatch.setattr(settings, "RATE_LIMIT", "2/minute")
    
    headers = {
        "X-Internal-Api-Key": settings.INTERNAL_API_KEY,
        "X-User-Id": "rl-user",
        "X-Forwarded-For": "203.0.113.77",
    }
    codes = [client.post("/api/chat", json={"message": f"Q{i}"}, headers=headers).status_code for i in range(3)]
    assert codes == [200, 200, 429]

    res = client.post("/api/chat", json={"message": "again"}, headers=headers)
    body = res.json()
    assert body["success"] is False
    assert body["errorCode"] == "RATE_LIMIT_EXCEEDED"
    assert "requestId" in body["meta"]

    # IP khác không bị ảnh hưởng
    other = {
        "X-Internal-Api-Key": settings.INTERNAL_API_KEY,
        "X-User-Id": "rl-user",
        "X-Forwarded-For": "203.0.113.78",
    }
    assert client.post("/api/chat", json={"message": "hi"}, headers=other).status_code == 200


@patch("api.chat.chatbot_agent.answer", new_callable=AsyncMock)
def test_spoofed_forwarded_for_from_untrusted_client_does_not_bypass_limit(mock_answer, monkeypatch):
    mock_answer.return_value = "ok"
    monkeypatch.setattr(settings, "RATE_LIMIT", "2/minute")
    
    direct = TestClient(app, client=("198.51.100.20", 40000))
    codes = [
        direct.post(
            "/api/chat",
            json={"message": f"Q{i}"},
            headers={
                "X-Internal-Api-Key": settings.INTERNAL_API_KEY,
                "X-User-Id": "spoofer",
                "X-Forwarded-For": f"10.0.0.{i}",
            },
        ).status_code
        for i in range(3)
    ]
    assert codes == [200, 200, 429]
