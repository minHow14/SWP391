# D:/SWP391/SWP391/ai_service/core/prompt_trace.py
# Ghi lại vết prompt (danh sách message đã gửi LLM) để Backend lưu trữ phục vụ kiểm tra/đối soát.
from typing import Any

from langchain_core.messages import BaseMessage


# Chuyển danh sách message LangChain thành dict { modelName, attempt, messages[] } với role chuẩn
# (user/assistant/system); attempt cho biết đây là lần thử thứ mấy khi agent phải sinh lại.
def prompt_trace(messages: list[BaseMessage], model_name: str, attempt: int = 1) -> dict[str, Any]:
    """Capture the messages used for inference for backend-owned persistence."""
    roles = {"human": "user", "ai": "assistant", "system": "system"}
    return {
        "modelName": model_name,
        "attempt": attempt,
        "messages": [{"role": roles[message.type], "content": message.content} for message in messages],
    }
