# D:/SWP391/SWP391/ai_service/tests/test_chat.py
# ai_service/tests/test_chat.py
# Kiểm thử API chatbot (/api/chat và /api/chat/stream): xác thực, validate input,
# xử lý lỗi LLM và luồng SSE. LLM luôn được mock nên không gọi provider thật.
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from core.config import settings
from main import app

client = TestClient(app)
INTERNAL_HEADERS = {"X-Internal-Api-Key": settings.INTERNAL_API_KEY}


# Chặn request không có khoá nội bộ để chỉ Back-end mới gọi được chatbot.
def test_chat_rejects_missing_internal_key():
    """Từ chối request nếu thiếu header X-Internal-Api-Key."""
    res = client.post("/api/chat", json={"message": "Xin chào"})
    assert res.status_code == 401
    assert res.json()["errorCode"] == "UNAUTHORIZED_INTERNAL"


# Câu hỏi rỗng phải bị từ chối sớm, tránh tốn lượt gọi LLM vô ích.
def test_chat_empty_message_returns_400():
    """Từ chối request nếu nội dung câu hỏi rỗng hoặc chỉ chứa khoảng trắng."""
    res = client.post("/api/chat", json={"message": "   "}, headers=INTERNAL_HEADERS)
    assert res.status_code == 400
    body = res.json()
    assert body["success"] is False
    assert body["errorCode"] == "INVALID_INPUT"


# Luồng thành công: trả về câu trả lời của agent kèm requestId trong meta để truy vết.
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


# Giới hạn độ dài menuContext để chặn prompt quá lớn (tốn token, dễ bị chèn lệnh).
def test_chat_overlong_menu_context_returns_422():
    """Gửi menu_context vượt quá 8000 ký tự -> Trả về 422 INVALID_INPUT."""
    res = client.post(
        "/api/chat",
        json={"message": "Giải thích thực đơn", "menuContext": "x" * 8001},
        headers=INTERNAL_HEADERS,
    )
    assert res.status_code == 422
    assert res.json()["errorCode"] == "INVALID_INPUT"


# Lỗi từ LLM phải được chuẩn hoá thành 502 AI_PROVIDER_ERROR thay vì lộ exception gốc.
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


# Streaming SSE: token được đẩy từng phần và sự kiện metadata phản ánh đúng các message
# đã gửi cho LLM (dùng để Back-end lưu vết hội thoại).
@patch("api.chat.chatbot_agent.answer_stream")
def test_chat_stream_success(mock_stream):
    """Kiểm tra streaming SSE trả về token từng phần."""
    # Generator giả lập LLM trả token theo từng mảnh.
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
    # Tách các block SSE và lấy payload của sự kiện metadata để so với prompt thực tế.
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
