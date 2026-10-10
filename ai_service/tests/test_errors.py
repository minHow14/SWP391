from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from main import app

# raise_server_exceptions=False: nhận response 500 như client thật thay vì để TestClient ném lỗi
client = TestClient(app, raise_server_exceptions=False)


def assert_envelope(res, status, code):
    assert res.status_code == status
    body = res.json()
    assert body["success"] is False
    assert body["error"]["code"] == code
    assert body["meta"]["requestId"].startswith("req_")
    assert res.headers["x-request-id"] == body["meta"]["requestId"]


def test_database_error_returns_503_envelope():
    error = OperationalError("INSERT ...", {}, Exception("database is locked"))
    with patch("core.quota.run_with_fallback", side_effect=error):
        res = client.post("/api/chat", json={"message": "hi"}, headers={"X-Guest-Id": "db-down"})
    assert_envelope(res, 503, "SERVICE_UNAVAILABLE")
    assert "locked" not in res.text


def test_unexpected_error_returns_500_envelope_without_details():
    with patch("api.chat.get_guest_usage", side_effect=RuntimeError("secret internal detail")):
        res = client.get("/api/chat/usage", headers={"X-Guest-Id": "boom"})
    assert_envelope(res, 500, "INTERNAL_ERROR")
    assert "secret internal detail" not in res.text
