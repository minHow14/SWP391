from typing import Type

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from core.config import settings

load_dotenv()

DEEPSEEK_BASE_URL = "https://api.deepseek.com"


def get_llm_text(timeout: float = 60.0) -> ChatOpenAI:
    """
    Initializes and returns the ChatOpenAI client configured for general text chatting (DeepSeek).
    """
    return ChatOpenAI(
        model=settings.DEEPSEEK_MODEL or "deepseek-chat",
        api_key=settings.DEEPSEEK_API_KEY,
        base_url=DEEPSEEK_BASE_URL,
        max_tokens=4096,
        temperature=0.7,
        request_timeout=timeout,
    )


def json_provider() -> str:
    """Provider phụ trách câu trả lời JSON có cấu trúc: Gemini nếu có API key, ngược lại DeepSeek."""
    return "gemini" if settings.GEMINI_API_KEY.strip() else "deepseek"


def get_json_model_name() -> str:
    """Tên model đang dùng cho câu trả lời JSON (dùng để ghi AILog)."""
    if json_provider() == "gemini":
        return settings.GEMINI_MODEL or "gemini-2.5-flash"
    return settings.DEEPSEEK_MODEL or "deepseek-chat"


def get_llm_json(timeout: float = 90.0) -> ChatOpenAI:
    """
    Initializes and returns the client for complex structured JSON generation, with an extended
    timeout (90s) and low temperature (0.3) for schema consistency.
    """
    if json_provider() == "gemini":
        return ChatOpenAI(
            model=get_json_model_name(),
            api_key=settings.GEMINI_API_KEY,
            base_url=settings.GEMINI_BASE_URL,
            max_tokens=8192,
            temperature=0.3,
            request_timeout=timeout,
        )
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
    LLM trả về đối tượng Pydantic theo `schema`. Dùng function calling vì cả Gemini (endpoint
    tương thích OpenAI) và DeepSeek đều hỗ trợ; DeepSeek từ chối response_format json_schema.
    """
    return get_llm_json(timeout=timeout).with_structured_output(schema, method="function_calling")
