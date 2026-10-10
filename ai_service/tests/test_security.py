from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient

from core.config import settings
from core.security import get_quota_reset_iso, get_today
from main import app

client = TestClient(app)


def make_token(secret=None, **claims):
    payload = {"sub": "42", "role": "USER", "exp": datetime.now(timezone.utc) + timedelta(hours=1), **claims}
    return jwt.encode(payload, secret or settings.jwt_secret, algorithm=settings.JWT_ALGORITHM)


def usage(headers):
    return client.get("/api/chat/usage", headers=headers)


def test_valid_jwt_is_authenticated_without_dev_headers():
    res = usage({"Authorization": f"Bearer {make_token()}"})
    assert res.status_code == 200
    assert res.json()["data"]["unlimited"] is True


def test_numeric_sub_from_node_backend_is_accepted():
    # jsonwebtoken (Node) giữ nguyên kiểu số: jwt.sign({ sub: 571 }, secret)
    res = usage({"Authorization": f"Bearer {make_token(sub=571)}"})
    assert res.status_code == 200
    assert res.json()["data"]["is_authenticated"] is True


def test_expired_jwt_returns_401_in_envelope():
    token = make_token(exp=datetime.now(timezone.utc) - timedelta(minutes=1))
    res = usage({"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    body = res.json()
    assert body["success"] is False
    assert body["error"]["code"] == "UNAUTHORIZED"
    assert "requestId" in body["meta"]


def test_jwt_signed_with_wrong_secret_returns_401():
    res = usage({"Authorization": f"Bearer {make_token(secret='another-secret-that-is-long-enough-xx')}"})
    assert res.status_code == 401


def test_malformed_authorization_header_returns_401():
    assert usage({"Authorization": "Token abc"}).status_code == 401


def test_jwt_without_user_id_returns_401():
    token = jwt.encode({"exp": datetime.now(timezone.utc) + timedelta(hours=1)}, settings.jwt_secret, algorithm="HS256")
    assert usage({"Authorization": f"Bearer {token}"}).status_code == 401


def test_dev_header_ignored_when_dev_mode_is_off(monkeypatch):
    monkeypatch.setattr(settings, "AUTH_DEV_MODE", False)
    data = usage({"X-User-Id": "someone", "X-Guest-Id": "g-dev-off"}).json()["data"]
    assert data["is_authenticated"] is False
    assert data["daily_limit"] == 3


def test_quota_reset_is_next_midnight_in_vietnam_time():
    reset = datetime.fromisoformat(get_quota_reset_iso())
    assert reset.utcoffset() == timedelta(hours=7)
    assert (reset.hour, reset.minute, reset.second) == (0, 0, 0)
    assert reset.date() == get_today() + timedelta(days=1)


@pytest.mark.parametrize("path", ["/api/chat/usage", "/api/meal-planner/usage"])
def test_usage_endpoints_report_unlimited_for_logged_in_users(path):
    data = client.get(path, headers={"X-User-Id": "u-1"}).json()["data"]
    assert data["is_authenticated"] is True and data["unlimited"] is True


def test_guests_without_header_get_separate_quota_per_ip():
    from unittest.mock import AsyncMock, patch

    first = TestClient(app, client=("198.51.100.1", 1000))
    second = TestClient(app, client=("198.51.100.2", 1000))
    with patch("api.chat.chatbot_agent.answer", new_callable=AsyncMock) as answer:
        answer.return_value = "ok"
        for i in range(3):
            assert first.post("/api/chat", json={"message": f"Q{i}"}).status_code == 200
        assert first.post("/api/chat", json={"message": "Q4"}).status_code == 429
        # Khách khác không gửi X-Guest-Id vẫn còn đủ lượt
        assert second.post("/api/chat", json={"message": "Q1"}).status_code == 200
    assert second.get("/api/chat/usage").json()["data"]["remaining_questions"] == 2


def test_overlong_guest_id_returns_400():
    res = usage({"X-Guest-Id": "g" * 101})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_INPUT"
