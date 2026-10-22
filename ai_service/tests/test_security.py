# ai_service/tests/test_security.py
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from core.config import settings
from core.security import verify_internal_api_key, resolve_identity, RequestIdentity
from main import app

client = TestClient(app)


def test_verify_internal_api_key_success():
    """Header X-Internal-Api-Key khớp với biến môi trường -> Xác thực thành công."""
    assert verify_internal_api_key(settings.INTERNAL_API_KEY) is True


def test_verify_internal_api_key_missing_raises_401():
    """Thiếu header X-Internal-Api-Key -> Bị từ chối với HTTP 401."""
    with pytest.raises(HTTPException) as exc_info:
        verify_internal_api_key(None)
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail["code"] == "UNAUTHORIZED_INTERNAL"


def test_verify_internal_api_key_invalid_raises_401():
    """Header X-Internal-Api-Key sai giá trị -> Bị từ chối với HTTP 401."""
    with pytest.raises(HTTPException) as exc_info:
        verify_internal_api_key("wrong_internal_api_key")
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail["code"] == "UNAUTHORIZED_INTERNAL"


def test_api_endpoint_rejects_missing_internal_key():
    """Mọi endpoint nghiệp vụ /api/* từ chối nếu không có header X-Internal-Api-Key."""
    res = client.post("/api/chat", json={"message": "Xin chào"})
    assert res.status_code == 401
    body = res.json()
    assert body["success"] is False
    assert body["errorCode"] == "UNAUTHORIZED_INTERNAL"


def test_api_endpoint_accepts_valid_internal_key(monkeypatch):
    """Có header X-Internal-Api-Key hợp lệ -> Được phép đi tiếp."""
    from unittest.mock import AsyncMock, patch

    with patch("api.chat.chatbot_agent.answer", new_callable=AsyncMock) as mock_answer:
        mock_answer.return_value = "Phản hồi thử nghiệm"
        res = client.post(
            "/api/chat",
            json={"message": "Xin chào"},
            headers={"X-Internal-Api-Key": settings.INTERNAL_API_KEY},
        )
        assert res.status_code == 200
        assert res.json()["success"] is True


def test_resolve_identity_authenticated_user():
    """Khi Backend Gateway gửi X-User-Id và X-User-Role -> Phân giải thành authenticated user."""
    identity = resolve_identity(
        request=None,
        x_user_id="user_123",
        x_user_role="ADMIN",
        x_guest_id=None,
    )
    assert isinstance(identity, RequestIdentity)
    assert identity.is_authenticated is True
    assert identity.user_id == "user_123"
    assert identity.user_role == "ADMIN"


def test_resolve_identity_guest_user():
    """Khi không có X-User-Id nhưng có X-Guest-Id -> Phân giải thành khách vãng lai."""
    identity = resolve_identity(
        request=None,
        x_user_id=None,
        x_user_role=None,
        x_guest_id="guest_xyz",
    )
    assert isinstance(identity, RequestIdentity)
    assert identity.is_authenticated is False
    assert identity.guest_id == "guest_xyz"
