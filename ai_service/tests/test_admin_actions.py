# D:/SWP391/SWP391/ai_service/tests/test_admin_actions.py
# ai_service/tests/test_admin_actions.py
from fastapi.testclient import TestClient

from core.config import settings
from main import app

client = TestClient(app)


def test_clear_chatbot_cache_rejects_missing_internal_key():
    """Từ chối yêu cầu xóa cache nếu không có header X-Internal-Api-Key."""
    res = client.post("/api/admin/chatbot-cache/clear")
    assert res.status_code == 401
    assert res.json()["errorCode"] == "UNAUTHORIZED_INTERNAL"


def test_clear_chatbot_cache_success():
    """Cho phép xóa cache chatbot khi có header X-Internal-Api-Key hợp lệ."""
    headers = {"X-Internal-Api-Key": settings.INTERNAL_API_KEY}
    res = client.post("/api/admin/chatbot-cache/clear", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert "cleared" in body["data"]
    assert isinstance(body["data"]["cleared"], int)
