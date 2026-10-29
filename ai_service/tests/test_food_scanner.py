# D:/SWP391/SWP391/ai_service/tests/test_food_scanner.py
import base64
import json
from contextlib import AbstractContextManager
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import Response

from core.config import settings
from core.ratelimit import limiter

IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
MAX_IMAGE_BYTES = 10 * 1024 * 1024
INTERNAL_HEADERS = {"X-Internal-Api-Key": settings.INTERNAL_API_KEY}


@pytest.fixture(autouse=True)
def scanner_test_state(monkeypatch: pytest.MonkeyPatch) -> None:
    limiter._storage.reset()
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "scanner-test-provider-key")


@pytest.fixture
def scan_result() -> dict:
    return {
        "dishName": "Nấm đùi gà sốt cà chua",
        "detectedScanType": "DISH",
        "status": "clear",
        "summary": "Nhận diện nấm và cà chua; chưa xác định được gia vị.",
        "findings": [],
        "identifiedIngredients": ["Nấm đùi gà", "Cà chua"],
        "restaurantChecklist": ["Nước sốt có dùng nước mắm không?"],
        "swapSuggestions": [],
    }


def scan_request(client: TestClient, **changes: object) -> Response:
    payload = {"imageBase64": IMAGE_BASE64, "mimeType": "image/png", "dietTypeId": 1}
    return client.post(
        "/api/food-scanner/analyze",
        json={**payload, **changes},
        headers=INTERNAL_HEADERS,
    )


def provider_response(content: object) -> AbstractContextManager[Mock]:
    return patch(
        "agents.food_scanner_agent.get_llm_json",
        return_value=SimpleNamespace(
            ainvoke=AsyncMock(return_value=SimpleNamespace(content=content))
        ),
    )


def test_food_scanner_rejects_missing_internal_key(client: TestClient) -> None:
    response = client.post(
        "/api/food-scanner/analyze", json={"imageBase64": IMAGE_BASE64, "dietTypeId": 1}
    )
    assert response.status_code == 401
    assert response.json()["errorCode"] == "UNAUTHORIZED_INTERNAL"


@pytest.mark.parametrize("dish_name", ["Nấm đùi gà sốt cà chua", "Nhãn thực phẩm"])
def test_unavailable_model_never_returns_fabricated_success(
    client: TestClient, dish_name: str
) -> None:
    with patch(
        "agents.food_scanner_agent.get_llm_json",
        side_effect=RuntimeError("secret-provider-token"),
    ):
        response = scan_request(client, scanType="LABEL", dishName=dish_name)
    assert response.status_code == 503
    body = response.json()
    assert body["success"] is False
    assert body["errorCode"] == "FOOD_SCAN_UNAVAILABLE"
    assert "data" not in body
    assert "secret-provider-token" not in response.text
    assert "imageBase64" not in response.text


def test_missing_provider_configuration_returns_unavailable(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "")
    with patch(
        "agents.food_scanner_agent.get_llm_json",
        side_effect=RuntimeError("missing config"),
    ):
        response = scan_request(client)
    assert response.status_code == 503
    assert response.json()["errorCode"] == "FOOD_SCAN_UNAVAILABLE"


def test_image_rejection_from_provider_returns_sanitized_unavailable(
    client: TestClient,
) -> None:
    model = SimpleNamespace(
        ainvoke=AsyncMock(side_effect=ValueError("image_url unsupported; secret"))
    )
    with patch("agents.food_scanner_agent.get_llm_json", return_value=model):
        response = scan_request(client)
    assert response.status_code == 503
    assert response.json()["errorCode"] == "FOOD_SCAN_UNAVAILABLE"
    assert "secret" not in response.text


@pytest.mark.parametrize(
    "content", ["not JSON", "{}", "[]", "prefix {} suffix", "{broken}", None]
)
def test_invalid_model_output_never_returns_fallback(
    client: TestClient, content: object
) -> None:
    with provider_response(content):
        response = scan_request(client)
    assert response.status_code == 502
    assert response.json()["errorCode"] == "FOOD_SCAN_INVALID_OUTPUT"
    assert response.json()["success"] is False
    assert "data" not in response.json()


def test_success_preserves_plant_ingredients_without_text_regex_false_positive(
    client: TestClient, scan_result: dict
) -> None:
    scan_result["status"] = "clear"
    with provider_response(json.dumps(scan_result, ensure_ascii=False)):
        response = scan_request(client, dishName="Nấm đùi gà sốt cà chua")
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["findings"] == []
    assert body["data"]["identifiedIngredients"] == ["Nấm đùi gà", "Cà chua"]
    assert body["data"]["status"] == "clear"
    assert body["data"]["nutritionEstimate"] is None
    assert "requestId" in body["meta"]


@pytest.mark.parametrize(
    "nutrition", [None, {"calories": 125.5, "protein": 3, "carbs": 0, "fat": 0}]
)
def test_success_keeps_explicit_nutrition_values(
    client: TestClient, scan_result: dict, nutrition: dict | None
) -> None:
    scan_result["nutritionEstimate"] = nutrition
    with provider_response(json.dumps(scan_result)):
        response = scan_request(client)
    assert response.status_code == 200
    assert response.json()["data"]["nutritionEstimate"] == nutrition


@pytest.mark.parametrize(
    "nutrition",
    [
        {},
        {"calories": 10},
        {"calories": None, "protein": 1, "carbs": 2, "fat": 3},
        {"calories": -1, "protein": 1, "carbs": 2, "fat": 3},
        {"calories": float("nan"), "protein": 1, "carbs": 2, "fat": 3},
        {"calories": float("inf"), "protein": 1, "carbs": 2, "fat": 3},
        {"calories": True, "protein": 1, "carbs": 2, "fat": 3},
        {"calories": "12", "protein": 1, "carbs": 2, "fat": 3},
    ],
)
def test_invalid_nutrition_is_rejected_without_defaulting_zero(
    client: TestClient, scan_result: dict, nutrition: dict
) -> None:
    scan_result["nutritionEstimate"] = nutrition
    with provider_response(json.dumps(scan_result)):
        response = scan_request(client)
    assert response.status_code == 502
    assert response.json()["errorCode"] == "FOOD_SCAN_INVALID_OUTPUT"


@pytest.mark.parametrize(
    "field",
    ["findings", "identifiedIngredients", "restaurantChecklist", "swapSuggestions"],
)
def test_model_output_requires_all_result_arrays(
    client: TestClient, scan_result: dict, field: str
) -> None:
    del scan_result[field]
    with provider_response(json.dumps(scan_result)):
        response = scan_request(client)
    assert response.status_code == 502


@pytest.mark.parametrize(
    "change",
    [
        {"dishName": " "},
        {"summary": ""},
        {"identifiedIngredients": [""]},
        {
            "findings": [
                {
                    "ingredient": "Nước mắm",
                    "reason": "Có cá",
                    "layer": 6,
                    "severity": "violation",
                }
            ]
        },
        {"status": "inconclusive"},
        {
            "status": "clear",
            "findings": [
                {
                    "ingredient": "Nước mắm",
                    "reason": "Có cá",
                    "layer": 1,
                    "severity": "violation",
                }
            ],
        },
    ],
)
def test_invalid_or_contradictory_result_returns_gateway_error(
    client: TestClient, scan_result: dict, change: dict
) -> None:
    scan_result.update(change)
    with provider_response(json.dumps(scan_result)):
        response = scan_request(client)
    assert response.status_code == 502


@pytest.mark.parametrize(
    "change",
    [
        {"mimeType": "image/gif"},
        {"imageBase64": ""},
        {"imageBase64": "%%%="},
        {"imageBase64": base64.b64encode(b"not an image").decode()},
        {"mimeType": "image/jpeg"},
        {"dietTypeId": 0},
        {"dishName": "a" * 151},
        {"allergies": [""]},
    ],
)
def test_invalid_scan_input_returns_validation_error(
    client: TestClient, change: dict
) -> None:
    with patch(
        "agents.food_scanner_agent.get_llm_json",
        side_effect=RuntimeError("must not infer"),
    ):
        response = scan_request(client, **change)
    assert response.status_code == 422
    assert response.json()["errorCode"] == "INVALID_INPUT"


def test_decoded_image_above_ten_mib_is_rejected(client: TestClient) -> None:
    image = base64.b64decode(IMAGE_BASE64)
    oversized = image + b"\x00" * (MAX_IMAGE_BYTES + 1 - len(image))
    with patch(
        "agents.food_scanner_agent.get_llm_json",
        side_effect=RuntimeError("must not infer"),
    ):
        response = scan_request(
            client, imageBase64=base64.b64encode(oversized).decode()
        )
    assert response.status_code == 422
    assert response.json()["errorCode"] == "INVALID_INPUT"
