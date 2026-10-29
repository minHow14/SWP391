# ai_service/tests/test_chat.py
# ai_service/tests/test_chat.py
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from core.config import settings
from main import app

client = TestClient(app)
INTERNAL_HEADERS = {"X-Internal-Api-Key": settings.INTERNAL_API_KEY}


def test_chat_rejects_missing_internal_key():
    """Từ chối request nếu thiếu header X-Internal-Api-Key."""
    res = client.post("/api/chat", json={"message": "Xin chào"})
    assert res.status_code == 401
    assert res.json()["errorCode"] == "UNAUTHORIZED_INTERNAL"


def test_chat_empty_message_returns_400():
    """Từ chối request nếu nội dung câu hỏi rỗng hoặc chỉ chứa khoảng trắng."""
    res = client.post("/api/chat", json={"message": "   "}, headers=INTERNAL_HEADERS)
    assert res.status_code == 400
    body = res.json()
    assert body["success"] is False
    assert body["errorCode"] == "INVALID_INPUT"


@patch("api.chat.chatbot_agent.answer", new_callable=AsyncMock)
def test_chat_valid_message_success(mock_answer):
    """Gửi câu hỏi hợp lệ -> Trả về câu trả lời từ trợ lý AI."""
    mock_answer.return_value = "Đậu phụ và đậu gà là nguồn đạm thực vật rất tốt."

    res = client.post(
        "/api/chat",
        json={"message": "Ăn gì để bổ sung protein?", "dietaryType": "vegan"},
        headers=INTERNAL_HEADERS,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["reply"] == "Đậu phụ và đậu gà là nguồn đạm thực vật rất tốt."
    assert "requestId" in body["meta"]


def test_chat_overlong_menu_context_returns_422():
    """Gửi menu_context vượt quá 8000 ký tự -> Trả về 422 INVALID_INPUT."""
    res = client.post(
        "/api/chat",
        json={"message": "Giải thích thực đơn", "menuContext": "x" * 8001},
        headers=INTERNAL_HEADERS,
    )
    assert res.status_code == 422
    assert res.json()["errorCode"] == "INVALID_INPUT"


@patch("api.chat.chatbot_agent.answer", new_callable=AsyncMock)
def test_chat_llm_failure_returns_502(mock_answer):
    """Khi LLM gặp sự cố -> Trả về lỗi 502 AI_PROVIDER_ERROR chuẩn hoá."""
    mock_answer.side_effect = Exception("Mất kết nối với mô hình AI")

    res = client.post(
        "/api/chat",
        json={"message": "Tư vấn món chay"},
        headers=INTERNAL_HEADERS,
    )
    assert res.status_code == 502
    body = res.json()
    assert body["success"] is False
    assert body["errorCode"] == "AI_PROVIDER_ERROR"


@patch("api.chat.chatbot_agent.answer_stream")
def test_chat_stream_success(mock_stream):
    """Kiểm tra streaming SSE trả về token từng phần."""
    async def sample_generator(*args, **kwargs):
        yield "Xin "
        yield "chào!"

    mock_stream.side_effect = sample_generator

    res = client.post(
        "/api/chat/stream",
        json={"message": "Xin chào"},
        headers=INTERNAL_HEADERS,
    )
    assert res.status_code == 200
    assert "text/event-stream" in res.headers["content-type"]
    assert "Xin " in res.text
    assert "chào!" in res.text
    events = []
    for block in res.text.replace("\r\n", "\n").split("\n\n"):
        if block.startswith("event: metadata"):
            import json
            events.append(json.loads(next(line[6:] for line in block.splitlines() if line.startswith("data:"))))
    trace = events[0]["data"]
    prepared = mock_stream.call_args.kwargs["prepared_messages"]
    assert trace["messages"] == [
        {"role": "system" if message.type == "system" else "user", "content": message.content}
        for message in prepared
    ]
