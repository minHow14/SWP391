import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from core.config import settings

load_dotenv()

def get_llm_text(timeout: float = 60.0) -> ChatOpenAI:
    """
    Initializes and returns the ChatOpenAI client configured for general text chatting.
    """
    return ChatOpenAI(
        model=settings.DEEPSEEK_MODEL or "deepseek-chat",
        api_key=settings.DEEPSEEK_API_KEY,
        base_url="https://api.deepseek.com",
        max_tokens=4096,
        temperature=0.7,
        request_timeout=timeout,
    )


def get_llm_json(timeout: float = 90.0) -> ChatOpenAI:
    """
    Initializes and returns the ChatOpenAI client configured for complex structured JSON generation,
    with an extended timeout (90s) and low temperature (0.3) for schema consistency.
    """
    return ChatOpenAI(
        model=settings.DEEPSEEK_MODEL or "deepseek-chat",
        api_key=settings.DEEPSEEK_API_KEY,
        base_url="https://api.deepseek.com",
        max_tokens=4096,
        temperature=0.3,
        request_timeout=timeout,
    )

