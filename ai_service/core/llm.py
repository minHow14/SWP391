from typing import Type

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from core.config import settings

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


def get_llm_json(timeout: float = 90.0) -> ChatGoogleGenerativeAI | ChatOpenAI:
    """
    Client cho các câu trả lời JSON phức tạp, timeout dài (90s) và temperature thấp (0.3)
    để đầu ra ổn định theo schema.
    """
    if json_provider() == "gemini":
        return ChatGoogleGenerativeAI(
            model=get_json_model_name(),
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3,
            max_output_tokens=16384,
            # Gemini 2.5 tính cả token "suy nghĩ" vào giới hạn đầu ra nên JSON dài bị cắt cụt;
            # tắt suy nghĩ để thực đơn trả về đầy đủ.
            thinking_budget=settings.GEMINI_THINKING_BUDGET,
            timeout=timeout,
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
    LLM trả về đối tượng Pydantic theo `schema`.
    - Gemini: dùng structured output gốc của Gemini.
    - DeepSeek: dùng function calling, vì DeepSeek từ chối response_format json_schema.
    """
    llm = get_llm_json(timeout=timeout)
    if json_provider() == "gemini":
        return llm.with_structured_output(schema)
    return llm.with_structured_output(schema, method="function_calling")
