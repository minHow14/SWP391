import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from main import app
from core.security import reset_guest_usage_for_tests

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_usage():
    reset_guest_usage_for_tests()
    yield
    reset_guest_usage_for_tests()

def test_guest_usage_initial():
    response = client.get("/api/chat/usage", headers={"X-Guest-Id": "test-guest-1"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["daily_limit"] == 3
    assert data["data"]["used_questions"] == 0
    assert data["data"]["remaining_questions"] == 3

def test_chat_empty_message():
    response = client.post("/api/chat", json={"message": "   "})
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_MESSAGE"

@patch("api.chat.chatbot_agent.answer", new_callable=AsyncMock)
def test_chat_valid_message_guest(mock_answer):
    mock_answer.return_value = "Đậu phụ và đậu gà là nguồn đạm thực vật rất tốt."

    response = client.post(
        "/api/chat",
        json={"message": "Ăn gì để bổ sung protein?"},
        headers={"X-Guest-Id": "test-guest-1"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["reply"] == "Đậu phụ và đậu gà là nguồn đạm thực vật rất tốt."
    assert data["data"]["remaining_questions"] == 2

    # Verify usage was updated
    usage_res = client.get("/api/chat/usage", headers={"X-Guest-Id": "test-guest-1"})
    assert usage_res.json()["data"]["used_questions"] == 1
    assert usage_res.json()["data"]["remaining_questions"] == 2

@patch("api.chat.chatbot_agent.answer", new_callable=AsyncMock)
def test_guest_chat_limit_reached(mock_answer):
    mock_answer.return_value = "Câu trả lời mẫu."
    headers = {"X-Guest-Id": "limited-guest"}

    # Ask 3 questions successfully
    for i in range(3):
        res = client.post("/api/chat", json={"message": f"Question {i+1}"}, headers=headers)
        assert res.status_code == 200
        assert res.json()["success"] is True

    # 4th question should hit rate limit HTTP 429
    res_4th = client.post("/api/chat", json={"message": "Question 4"}, headers=headers)
    assert res_4th.status_code == 429
    data = res_4th.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CHAT_LIMIT_REACHED"
    assert data["error"]["remaining_questions"] == 0

@patch("api.chat.chatbot_agent.answer", new_callable=AsyncMock)
def test_authenticated_user_chat(mock_answer):
    mock_answer.return_value = "Chào người dùng thân thiết."
    response = client.post(
        "/api/chat",
        json={"message": "Tôi muốn gợi ý món chay."},
        headers={"X-User-Id": "1001", "X-User-Role": "USER"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["remaining_questions"] is None
