# D:/SWP391/SWP391/ai_service/tests/test_health.py
# ai_service/tests/test_health.py
# Kiểm thử endpoint kiểm tra sức khoẻ và endpoint gốc của AI Service.
from fastapi.testclient import TestClient

from core.config import settings
from main import app

client = TestClient(app)


# /health trả về status ok (dùng để Back-end kiểm tra AI Service còn sống).
def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["status"] == "ok"


# Endpoint gốc (có khoá nội bộ) trả về trạng thái online.
def test_root_endpoint():
    response = client.get("/", headers={"X-Internal-Api-Key": settings.INTERNAL_API_KEY})
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["status"] == "online"
