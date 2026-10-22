# D:/SWP391/SWP391/ai_service/tests/test_health.py
# ai_service/tests/test_health.py
from fastapi.testclient import TestClient

from core.config import settings
from main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["status"] == "ok"


def test_root_endpoint():
    response = client.get("/", headers={"X-Internal-Api-Key": settings.INTERNAL_API_KEY})
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["status"] == "online"
