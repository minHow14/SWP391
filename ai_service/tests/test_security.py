# D:/SWP391/SWP391/ai_service/tests/test_security.py
# ai_service/tests/test_security.py
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from core.config import settings
from core.security import RequestIdentity, resolve_identity, verify_internal_api_key
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
    """Chỉ dùng định danh từ BE, không giữ vai trò hay phân quyền trong AI."""
    identity = resolve_identity(
        request=None,
        x_user_id="user_123",
        x_guest_id=None,
    )
    assert isinstance(identity, RequestIdentity)
    assert identity.is_authenticated is True
    assert identity.user_id == "user_123"
    assert "user_role" not in RequestIdentity.model_fields


def test_resolve_identity_guest_user():
    """Khi không có X-User-Id nhưng có X-Guest-Id -> Phân giải thành khách vãng lai."""
    identity = resolve_identity(
        request=None,
        x_user_id=None,
        x_guest_id="guest_xyz",
    )
    assert isinstance(identity, RequestIdentity)
    assert identity.is_authenticated is False
    assert identity.guest_id == "guest_xyz"


@pytest.mark.parametrize("internal_key", [None, "untrusted-client-key"])
@pytest.mark.parametrize(("method", "path", "payload"), [
    ("GET", "/", None),
    ("POST", "/api/chat", {"message": "Kiểm tra xác thực"}),
    ("POST", "/api/chat/stream", {"message": "Kiểm tra xác thực"}),
    ("POST", "/api/meal-planner/generate", {"heightCm": 170, "weightKg": 65}),
    ("POST", "/api/meal-planner/generate/stream", {"heightCm": 170, "weightKg": 65}),
    ("POST", "/api/admin/chatbot-cache/clear", None),
])
def test_user_credentials_cannot_replace_internal_authentication(internal_key, method, path, payload):
    headers = {"Authorization": "Bearer untrusted-token", "X-User-Id": "1", "X-User-Role": "ADMIN"}
    if internal_key is not None:
        headers["X-Internal-Api-Key"] = internal_key
    response = client.request(method, path, json=payload, headers=headers)
    assert response.status_code == 401
    assert response.json()["errorCode"] == "UNAUTHORIZED_INTERNAL"


def test_internal_cache_action_does_not_require_user_role_or_jwt():
    from unittest.mock import patch

    with patch("api.admin_actions.chatbot_agent.clear_cache", return_value=0) as clear:
        response = client.post("/api/admin/chatbot-cache/clear", headers={
            "X-Internal-Api-Key": settings.INTERNAL_API_KEY,
            "Authorization": "Bearer ignored-user-token", "X-User-Role": "untrusted-role",
        })
    assert response.status_code == 200
    clear.assert_called_once()


def test_openapi_identity_contract_has_no_user_role_or_jwt():
    operation = app.openapi()["paths"]["/api/chat"]["post"]
    names = {parameter["name"].lower() for parameter in operation.get("parameters", [])}
    assert "x-internal-api-key" in names
    assert "x-user-role" not in names
    assert "authorization" not in names
