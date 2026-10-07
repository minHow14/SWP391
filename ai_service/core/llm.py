import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from core.config import settings

load_dotenv()

def get_llm_text() -> ChatOpenAI:
    """
    Initializes and returns the ChatOpenAI client configured for DeepSeek API.
    """
    return ChatOpenAI(
        model=settings.DEEPSEEK_MODEL or "deepseek-chat",
        api_key=settings.DEEPSEEK_API_KEY,
        base_url="https://api.deepseek.com",
        max_tokens=4096,
        temperature=0.7,
    )
