from core import llm
from core.config import settings


def test_json_provider_uses_deepseek_without_gemini_key(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    assert llm.json_provider() == "deepseek"
    assert llm.get_json_model_name() == (settings.DEEPSEEK_MODEL or "deepseek-chat")
    client = llm.get_llm_json()
    assert "deepseek" in str(client.openai_api_base)


def test_json_provider_uses_gemini_when_key_is_set(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(settings, "GEMINI_MODEL", "gemini-test-model")
    assert llm.json_provider() == "gemini"
    assert llm.get_json_model_name() == "gemini-test-model"
    client = llm.get_llm_json()
    assert type(client).__name__ == "ChatGoogleGenerativeAI"
    assert client.model == "gemini-test-model"


def test_structured_llm_binds_schema_for_both_providers(monkeypatch):
    from agents.meal_planner_agent import GeneratedMealPlan

    for key in ("", "test-key"):
        monkeypatch.setattr(settings, "GEMINI_API_KEY", key)
        assert llm.get_structured_llm(GeneratedMealPlan) is not None


def test_text_llm_always_uses_deepseek(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    assert "deepseek" in str(llm.get_llm_text().openai_api_base)
