# ai_service/core/llm.py

import httpx
import openai
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from core.config import settings

DEEPSEEK_BASE_URL = "https://api.deepseek.com"

# Lỗi phía nhà cung cấp (model không tồn tại/quá tải, 4xx-5xx, mất kết nối, timeout) thì chuyển sang
# model dự phòng. Lỗi sai định dạng đầu ra là ValueError và để agent tự thử lại kèm góp ý.
PROVIDER_ERRORS = (openai.APIError, httpx.HTTPError, TimeoutError)

# Chat trả lời ngắn; thực đơn JSON dài hơn nhiều (7 ngày ~6.400-7.500 token, 3 ngày ~3.900)
TEXT_MAX_TOKENS = 4096
JSON_MAX_TOKENS = 8192


def get_json_model_name() -> str:
    """Tên model chính (ghi vào AILog)."""
    return settings.DEEPSEEK_MODEL or "deepseek-chat"


def _client(
    model: str, temperature: float, timeout: float, thinking: bool = True, max_tokens: int = TEXT_MAX_TOKENS
) -> ChatOpenAI:
    return ChatOpenAI(
        model=model,
        api_key=settings.DEEPSEEK_API_KEY or None,
        base_url=DEEPSEEK_BASE_URL,
        max_tokens=max_tokens,
        temperature=temperature,
        request_timeout=timeout,
        # Model suy nghĩ (deepseek-v4-pro) từ chối tool_choice bắt buộc dùng cho JSON (HTTP 400) và
        # dùng token để suy nghĩ nên có thể trả nội dung rỗng; tắt thinking cho model dự phòng.
        extra_body=None if thinking else {"thinking": {"type": "disabled"}},
    )


def _fallback_model() -> str | None:
    """Model dự phòng (DEEPSEEK_FALLBACK_MODEL); None nếu để trống hoặc trùng model chính."""
    fallback = (settings.DEEPSEEK_FALLBACK_MODEL or "").strip()
    return fallback if fallback and fallback != get_json_model_name() else None


def with_model_fallback(primary, fallback):
    """Gọi `primary`; nếu nhà cung cấp báo lỗi thì chạy lại bằng `fallback` (nếu có)."""
    if fallback is None:
        return primary
    return primary.with_fallbacks([fallback], exceptions_to_handle=PROVIDER_ERRORS)


def get_llm_text(timeout: float = 60.0):
    """Client DeepSeek cho hội thoại thường (chatbot), tự chuyển sang model dự phòng khi lỗi."""
    fallback_model = _fallback_model()
    return with_model_fallback(
        _client(get_json_model_name(), 0.7, timeout),
        _client(fallback_model, 0.7, timeout, thinking=False) if fallback_model else None,
    )


def get_llm_json(timeout: float = 90.0) -> ChatOpenAI:
    """
    Client DeepSeek (model chính) cho câu trả lời JSON phức tạp: timeout dài (90s), temperature thấp
    (0.3) để đầu ra ổn định theo schema.
    """
    return _client(get_json_model_name(), 0.3, timeout, max_tokens=JSON_MAX_TOKENS)


def get_structured_llm(schema: type[BaseModel], timeout: float = 90.0):
    """
    LLM trả về đối tượng Pydantic theo `schema`, tự chuyển sang model dự phòng khi nhà cung cấp lỗi.
    Dùng function calling vì DeepSeek từ chối response_format json_schema (HTTP 400).
    """
    def structured(client: ChatOpenAI):
        return client.with_structured_output(schema, method="function_calling")

    fallback_model = _fallback_model()
    return with_model_fallback(
        structured(get_llm_json(timeout=timeout)),
        structured(_client(fallback_model, 0.3, timeout, thinking=False, max_tokens=JSON_MAX_TOKENS))
        if fallback_model
        else None,
    )
