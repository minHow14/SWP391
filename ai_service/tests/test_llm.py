from agents.meal_planner_agent import GeneratedMealPlan
from core import llm
from core.config import settings


def test_json_and_text_llms_use_deepseek():
    assert llm.get_json_model_name() == (settings.DEEPSEEK_MODEL or "deepseek-chat")
    assert "deepseek" in str(llm.get_llm_json().openai_api_base)
    assert "deepseek" in str(llm.get_llm_text().openai_api_base)


def test_structured_llm_binds_the_schema():
    assert llm.get_structured_llm(GeneratedMealPlan) is not None
