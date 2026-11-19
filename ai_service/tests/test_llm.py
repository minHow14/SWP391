# D:/SWP391/SWP391/ai_service/tests/test_llm.py
import json

import httpx
import openai
import pytest
from agents.meal_planner_agent import GeneratedMealPlan
from core import llm
from core.config import settings
from langchain_core.runnables import RunnableLambda
from pydantic import BaseModel


@pytest.fixture(autouse=True)
def mock_llm_credentials(monkeypatch):
    """Cấp key giả tự động cho mọi test trong file này để ChatOpenAI không báo lỗi thiếu key trên CI."""
    monkeypatch.setenv("OPENAI_API_KEY", "test-dummy-key")
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "test-deepseek-key", raising=False)


def provider_error() -> Exception:
    return openai.APIConnectionError(request=httpx.Request("POST", "https://api.deepseek.com"))


def test_primary_and_fallback_models_come_from_settings(monkeypatch):
    monkeypatch.setattr(settings, "DEEPSEEK_MODEL", "deepseek-chat")
    monkeypatch.setattr(settings, "DEEPSEEK_FALLBACK_MODEL", "deepseek-v4-pro")
    assert llm.get_json_model_name() == "deepseek-chat"
    assert llm._fallback_model() == "deepseek-v4-pro"
    assert "deepseek" in str(llm.get_llm_json().openai_api_base)
    assert llm.get_llm_json().model_name == "deepseek-chat"


def test_no_fallback_when_disabled_or_same_as_primary(monkeypatch):
    monkeypatch.setattr(settings, "DEEPSEEK_MODEL", "deepseek-chat")
    for value in ("", "  ", "deepseek-chat"):
        monkeypatch.setattr(settings, "DEEPSEEK_FALLBACK_MODEL", value)
        assert llm._fallback_model() is None
        assert type(llm.get_llm_text()).__name__ == "ChatOpenAI"  # không bọc fallback


def test_llms_with_fallback_are_built_for_chat_and_structured_output(monkeypatch):
    monkeypatch.setattr(settings, "DEEPSEEK_FALLBACK_MODEL", "deepseek-v4-pro")
    assert type(llm.get_llm_text()).__name__ == "RunnableWithFallbacks"
    assert type(llm.get_structured_llm(GeneratedMealPlan)).__name__ == "RunnableWithFallbacks"


@pytest.mark.asyncio
async def test_provider_error_switches_to_the_fallback_model():
    def failing(_):
        raise provider_error()

    chain = llm.with_model_fallback(RunnableLambda(failing), RunnableLambda(lambda x: f"fallback:{x}"))
    assert await chain.ainvoke("hi") == "fallback:hi"


@pytest.mark.asyncio
async def test_format_errors_are_not_swallowed_by_the_fallback():
    def bad_format(_):
        raise ValueError("Truncated JSON")

    chain = llm.with_model_fallback(RunnableLambda(bad_format), RunnableLambda(lambda x: "fallback"))
    with pytest.raises(ValueError):
        await chain.ainvoke("hi")


@pytest.mark.asyncio
async def test_healthy_primary_does_not_call_the_fallback():
    calls = []
    chain = llm.with_model_fallback(
        RunnableLambda(lambda x: "primary"), RunnableLambda(lambda x: calls.append(x) or "fallback")
    )
    assert await chain.ainvoke("hi") == "primary"
    assert calls == []


def test_fallback_model_runs_with_thinking_disabled(monkeypatch):
    monkeypatch.setattr(settings, "DEEPSEEK_MODEL", "deepseek-chat")
    monkeypatch.setattr(settings, "DEEPSEEK_FALLBACK_MODEL", "deepseek-v4-pro")
    primary = llm._client("deepseek-chat", 0.3, 30)
    fallback = llm._client("deepseek-v4-pro", 0.3, 30, thinking=False)
    assert not primary.extra_body
    assert fallback.extra_body == {"thinking": {"type": "disabled"}}


def test_json_clients_get_a_larger_token_budget_than_chat(monkeypatch):
    monkeypatch.setattr(settings, "DEEPSEEK_MODEL", "deepseek-chat")
    assert llm.get_llm_json().max_tokens == 8192
    assert llm._client("deepseek-chat", 0.7, 30).max_tokens == 4096  # chat giữ nguyên
    assert llm.JSON_MAX_TOKENS > llm.TEXT_MAX_TOKENS


class StructuredReply(BaseModel):
    text: str


def structured_reply_response(model: str) -> httpx.Response:
    tool_call = {
        "id": "reply", "type": "function", "function": {
            "name": "StructuredReply", "arguments": '{"text":"validated"}',
        },
    }
    return httpx.Response(200, json={
        "id": "structured-reply", "object": "chat.completion", "created": 0,
        "model": model, "choices": [{
            "index": 0, "finish_reason": "tool_calls",
            "message": {"role": "assistant", "content": None, "tool_calls": [tool_call]},
        }],
    })


@pytest.mark.parametrize("use_fallback", [False, True])
def test_structured_requests_preserve_primary_thinking_and_disable_fallback_thinking(
    monkeypatch: pytest.MonkeyPatch, use_fallback: bool,
) -> None:
    models: list[str] = []

    def respond(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content)
        models.append(payload["model"])
        if use_fallback and payload["model"] == "deepseek-chat":
            return httpx.Response(503, json={"error": {"message": "Service unavailable"}})
        assert payload["tool_choice"]["function"]["name"] == "StructuredReply"
        assert payload.get("thinking") == ({"type": "disabled"} if use_fallback else None)
        return structured_reply_response(payload["model"])

    chat_open_ai = llm.ChatOpenAI
    with httpx.Client(transport=httpx.MockTransport(respond)) as client:
        monkeypatch.setattr(llm, "ChatOpenAI", lambda **kwargs: chat_open_ai(
            **kwargs, http_client=client, max_retries=0,
        ))
        monkeypatch.setattr(settings, "DEEPSEEK_MODEL", "deepseek-chat")
        monkeypatch.setattr(settings, "DEEPSEEK_FALLBACK_MODEL", "deepseek-v4-pro")
        result = llm.get_structured_llm(StructuredReply).invoke("Return a structured reply.")
    assert result.text == "validated"
    assert models == (["deepseek-chat", "deepseek-v4-pro"] if use_fallback else ["deepseek-chat"])
