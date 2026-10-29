# ai_service/core/prompt_trace.py
from typing import Any

from langchain_core.messages import BaseMessage


def prompt_trace(messages: list[BaseMessage], model_name: str, attempt: int = 1) -> dict[str, Any]:
    """Capture the messages used for inference for backend-owned persistence."""
    roles = {"human": "user", "ai": "assistant", "system": "system"}
    return {
        "modelName": model_name,
        "attempt": attempt,
        "messages": [{"role": roles[message.type], "content": message.content} for message in messages],
    }
