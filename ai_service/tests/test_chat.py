import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from main import app
from core.security import reset_guest_usage_for_tests
from agents.chatbot_agent import ChatbotAgent

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
        headers={"X-Guest-Id": "test-guest-1"},
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
def test_chat_with_history_and_dietary_type(mock_answer):
    mock_answer.return_value = "Với chế độ thuần chay, bạn có thể uống sữa đậu nành hoặc sữa yến mạch."

    payload = {
        "message": "Uống sữa gì thay sữa bò?",
        "history": [
            {"role": "user", "content": "Tôi đang ăn thuần chay."},
            {"role": "assistant", "content": "Rất vui được hỗ trợ bạn trong lối sống thuần chay!"},
        ],
        "dietary_type": "vegan",
    }
    response = client.post(
        "/api/chat",
        json=payload,
        headers={"X-Guest-Id": "test-guest-diet"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "sữa đậu nành" in data["data"]["reply"]

    # Verify mock was called with history and dietary_type
    mock_answer.assert_called_once()
    args, kwargs = mock_answer.call_args
    assert args[0] == "Uống sữa gì thay sữa bò?"
    assert kwargs["dietary_type"] == "vegan"
    assert len(kwargs["history"]) == 2


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
        headers={"X-User-Id": "1001", "X-User-Role": "USER"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["remaining_questions"] is None


@pytest.mark.asyncio
async def test_chatbot_agent_caching():
    agent = ChatbotAgent()
    # Mock LLM to return different values if called
    with patch("agents.chatbot_agent.get_llm_text") as mock_get_llm:
        mock_llm_instance = AsyncMock()
        mock_llm_instance.ainvoke.return_value.content = "Đậu gà chứa nhiều folate và sắt."
        mock_get_llm.return_value = mock_llm_instance

        # Call 1st time
        res1 = await agent.answer("Đậu gà có chất gì?")
        assert res1 == "Đậu gà chứa nhiều folate và sắt."
        assert mock_llm_instance.ainvoke.call_count == 1

        # Call 2nd time with same message & no history -> should hit cache!
        res2 = await agent.answer("Đậu gà có chất gì?")
        assert res2 == "Đậu gà chứa nhiều folate và sắt."
        # Call count should still be 1 because it retrieved from cache
        assert mock_llm_instance.ainvoke.call_count == 1


def test_chat_stream_empty_message():
    response = client.post("/api/chat/stream", json={"message": ""})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_MESSAGE"


@patch("api.chat.chatbot_agent.answer", new_callable=AsyncMock)
def test_chat_stream_guest_limit_reached(mock_answer):
    mock_answer.return_value = "Câu trả lời."
    headers = {"X-Guest-Id": "stream-limited-guest"}
    # Use up 3 requests via normal chat
    for i in range(3):
        res = client.post("/api/chat", json={"message": f"Q {i}"}, headers=headers)
        assert res.status_code == 200

    # 4th request on stream hits 429
    res_4th = client.post("/api/chat/stream", json={"message": "Q 4"}, headers=headers)
    assert res_4th.status_code == 429
    assert res_4th.json()["error"]["code"] == "CHAT_LIMIT_REACHED"


@patch("api.chat.chatbot_agent.answer_stream")
def test_chat_stream_valid(mock_stream):
    async def mock_generator(*args, **kwargs):
        yield "Chào "
        yield "bạn "
        yield "yêu quý!"

    mock_stream.side_effect = mock_generator

    response = client.post(
        "/api/chat/stream",
        json={"message": "Xin chào"},
        headers={"X-Guest-Id": "stream-guest-valid"},
    )
    assert response.status_code == 200
    content = response.text
    assert "token" in content
    assert "Chào " in content
    assert "done" in content
