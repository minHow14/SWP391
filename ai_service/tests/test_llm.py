import httpx
import openai
import pytest
from langchain_core.runnables import RunnableLambda

from agents.meal_planner_agent import GeneratedMealPlan
from core import llm
from core.config import settings


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
