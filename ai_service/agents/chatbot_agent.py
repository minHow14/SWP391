from pathlib import Path
from typing import Optional
from langchain_core.messages import SystemMessage, HumanMessage
from core.llm import get_llm_text

PROMPT_FILE = Path(__file__).resolve().parent.parent / "prompts" / "chatbot.md"

class ChatbotAgent:
    """
    Simple Chatbot Agent responsible for loading system prompt and invoking DeepSeek LLM.
    """
    def __init__(self):
        self._prompt_content: Optional[str] = None

    def load_prompt(self) -> str:
        if self._prompt_content is None:
            if PROMPT_FILE.exists():
                self._prompt_content = PROMPT_FILE.read_text(encoding="utf-8")
            else:
                self._prompt_content = (
                    "Bạn là Trợ lý AI của hệ thống Vegetarian Support System, "
                    "hỗ trợ tư vấn dinh dưỡng và món ăn chay lành mạnh."
                )
        return self._prompt_content

    async def answer(self, user_message: str) -> str:
        """
        Loads the system prompt, invokes the LLM with the user message, and returns the response.
        """
        system_prompt = self.load_prompt()
        llm = get_llm_text()
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message),
        ]
        
        # Invoke LLM asynchronously
        response = await llm.ainvoke(messages)
        return str(response.content)

chatbot_agent = ChatbotAgent()
