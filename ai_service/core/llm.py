from typing import Type

from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from core.config import settings

DEEPSEEK_BASE_URL = "https://api.deepseek.com"


def get_json_model_name() -> str:
    """Tên model dùng cho câu trả lời JSON (ghi vào AILog)."""
    return settings.DEEPSEEK_MODEL or "deepseek-chat"


def get_llm_text(timeout: float = 60.0) -> ChatOpenAI:
    """
    Client DeepSeek cho hội thoại thường (chatbot).
    """
    return ChatOpenAI(
        model=get_json_model_name(),
        api_key=settings.DEEPSEEK_API_KEY,
        base_url=DEEPSEEK_BASE_URL,
        max_tokens=4096,
        temperature=0.7,
        request_timeout=timeout,
    )


def get_llm_json(timeout: float = 90.0) -> ChatOpenAI:
    """
    Client DeepSeek cho câu trả lời JSON phức tạp: timeout dài (90s), temperature thấp (0.3)
    để đầu ra ổn định theo schema.
    """
    return ChatOpenAI(
        model=get_json_model_name(),
        api_key=settings.DEEPSEEK_API_KEY,
        base_url=DEEPSEEK_BASE_URL,
        max_tokens=4096,
        temperature=0.3,
        request_timeout=timeout,
    )


def get_structured_llm(schema: Type[BaseModel], timeout: float = 90.0):
    """
    LLM trả về đối tượng Pydantic theo `schema`. Dùng function calling vì DeepSeek từ chối
    response_format json_schema (HTTP 400).
    """
    return get_llm_json(timeout=timeout).with_structured_output(schema, method="function_calling")
