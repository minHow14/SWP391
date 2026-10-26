# ai_service/tests/test_food_scanner.py
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient

from agents.food_scanner_agent import food_scanner_agent
from core.config import settings
from main import app
from schemas.food_scanner import FoodScanRequest

client = TestClient(app)
INTERNAL_HEADERS = {"X-Internal-Api-Key": settings.INTERNAL_API_KEY}
DUMMY_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


def test_food_scanner_rejects_missing_internal_key():
    """Từ chối request nếu thiếu header X-Internal-Api-Key."""
    res = client.post(
        "/api/food-scanner/analyze",
        json={"imageBase64": DUMMY_BASE64, "dietTypeId": 1},
    )
    assert res.status_code == 401
    assert res.json()["errorCode"] == "UNAUTHORIZED_INTERNAL"


def test_food_scanner_rejects_invalid_mime_type():
    """Từ chối nếu mimeType không hợp lệ."""
    res = client.post(
        "/api/food-scanner/analyze",
        json={
            "imageBase64": DUMMY_BASE64,
            "mimeType": "image/gif",
            "dietTypeId": 1,
        },
        headers=INTERNAL_HEADERS,
    )
    assert res.status_code == 422
    assert res.json()["errorCode"] == "INVALID_INPUT"


@pytest.mark.asyncio
async def test_agent_detects_meat_violation():
    """Phát hiện thịt bò/heo -> vi phạm Lớp 1."""
    req = FoodScanRequest(
        image_base64=DUMMY_BASE64,
        diet_type_id=1,
        scan_type="DISH",
        dish_name="Phở bò tái nạm",
    )
    result = await food_scanner_agent.analyze(req)
    assert result.status == "warning"
    assert any(f.layer == 1 for f in result.findings)


@pytest.mark.asyncio
async def test_agent_detects_additive_e120_violation():
    """Phát hiện mã phụ gia E120 (Carmine từ bọ cánh kiến) -> vi phạm Lớp 2."""
    req = FoodScanRequest(
        image_base64=DUMMY_BASE64,
        diet_type_id=1,
        scan_type="LABEL",
        dish_name="Kẹo dâu chứa E120 và gelatin",
    )
    result = await food_scanner_agent.analyze(req)
    assert result.status == "warning"
    assert any(f.layer == 2 for f in result.findings)


@pytest.mark.asyncio
async def test_agent_five_pungents_in_buddhist_diet():
    """Chế độ Chay Phật giáo (diet_type_id = 5) nghiêm cấm Ngũ vị tân (hành, tỏi)."""
    buddhist_req = FoodScanRequest(
        image_base64=DUMMY_BASE64,
        diet_type_id=5,
        scan_type="DISH",
        dish_name="Đậu hũ xào tỏi phi hành lá",
    )
    res_buddhist = await food_scanner_agent.analyze(buddhist_req)
    assert res_buddhist.status == "warning"
    assert any(f.layer == 4 for f in res_buddhist.findings)

    # Cùng món đó nhưng theo chế độ Thuần chay chung (diet_type_id = 1) -> Không vi phạm lớp 4
    vegan_req = FoodScanRequest(
        image_base64=DUMMY_BASE64,
        diet_type_id=1,
        scan_type="DISH",
        dish_name="Đậu hũ sốt cà chua hành tây",
    )
    res_vegan = await food_scanner_agent.analyze(vegan_req)
    assert not any(f.layer == 4 for f in res_vegan.findings)


@pytest.mark.asyncio
async def test_agent_detects_personal_allergy():
    """Phát hiện chất gây dị ứng theo khai báo cá nhân -> Lớp 5."""
    req = FoodScanRequest(
        image_base64=DUMMY_BASE64,
        diet_type_id=1,
        scan_type="LABEL",
        dish_name="Sữa hạt đậu phộng",
        allergies=["đậu phộng"],
    )
    result = await food_scanner_agent.analyze(req)
    assert any(f.layer == 5 for f in result.findings)


def test_food_scanner_endpoint_success():
    """Endpoint HTTP phân tích thành công và trả về định dạng camelCase chuẩn."""
    res = client.post(
        "/api/food-scanner/analyze",
        json={
            "imageBase64": DUMMY_BASE64,
            "mimeType": "image/jpeg",
            "dietTypeId": 1,
            "scanType": "AUTO",
            "dishName": "Canh chua nấm chay",
        },
        headers=INTERNAL_HEADERS,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "data" in data
    assert "dishName" in data["data"]
    assert "status" in data["data"]
    assert "restaurantChecklist" in data["data"]
    assert "nutritionEstimate" in data["data"]
    assert "requestId" in data["meta"]
