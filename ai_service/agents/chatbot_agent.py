from pathlib import Path
from typing import Optional, List, AsyncGenerator, Any
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from cachetools import TTLCache
from core.llm import get_llm_text

PROMPT_FILE = Path(__file__).resolve().parent.parent / "prompts" / "chatbot.md"


class ChatbotAgent:
    """
    Chatbot Agent hỗ trợ hội thoại đa lượt (multi-turn), nhận diện trường phái ăn chay,
    bộ nhớ đệm TTL Cache và streaming response.
    """
    def __init__(self):
        self._prompt_content: Optional[str] = None
        # Cache các câu hỏi tra cứu dinh dưỡng lặp lại trong 1 giờ (tối đa 150 câu)
        self._cache: TTLCache = TTLCache(maxsize=150, ttl=3600)

    def load_prompt(self, dietary_type: Optional[str] = None) -> str:
        if self._prompt_content is None:
            if PROMPT_FILE.exists():
                self._prompt_content = PROMPT_FILE.read_text(encoding="utf-8")
            else:
                self._prompt_content = (
                    "Bạn là Trợ lý AI của hệ thống Vegetarian Support System, "
                    "hỗ trợ tư vấn dinh dưỡng và món ăn chay lành mạnh."
                )

        prompt = self._prompt_content
        if dietary_type and dietary_type.strip():
            diet_clean = dietary_type.strip()
            prompt += (
                f"\n\n--- THÔNG TIN CHẾ ĐỘ ĂN CỦA NGƯỜI DÙNG ---\n"
                f"Người dùng hiện tại đang tuân theo trường phái ăn chay: '{diet_clean}'.\n"
                f"LƯU Ý QUAN TRỌNG: Mọi tư vấn, gợi ý nguyên liệu, món ăn hay chất thay thế BẮT BUỘC "
                f"phải tuyệt đối tuân thủ theo trường phái '{diet_clean}' này "
                f"(Ví dụ: nếu là thuần chay / vegan thì không dùng trứng, sữa động vật, phô mai, mật ong; "
                f"nếu là lacto thì được dùng sữa nhưng không dùng trứng; "
                f"nếu là ovo thì được dùng trứng nhưng không dùng sữa)."
            )
        return prompt

    def build_messages(
        self,
        user_message: str,
        history: Optional[List[Any]] = None,
        dietary_type: Optional[str] = None,
    ) -> List[BaseMessage]:
        system_prompt = self.load_prompt(dietary_type=dietary_type)
        messages: List[BaseMessage] = [SystemMessage(content=system_prompt)]

        if history:
            # Lấy tối đa 10 lượt hội thoại gần nhất để tránh tràn context
            for msg in history[-10:]:
                role = msg.get("role", "user") if isinstance(msg, dict) else getattr(msg, "role", "user")
                content = msg.get("content", "") if isinstance(msg, dict) else getattr(msg, "content", "")
                if not content or not str(content).strip():
                    continue

                if role == "assistant":
                    messages.append(AIMessage(content=str(content).strip()))
                elif role == "user":
                    messages.append(HumanMessage(content=str(content).strip()))

        messages.append(HumanMessage(content=user_message.strip()))
        return messages

    async def answer(
        self,
        user_message: str,
        history: Optional[List[Any]] = None,
        dietary_type: Optional[str] = None,
    ) -> str:
        """
        Xử lý tin nhắn và trả về câu trả lời dạng chuỗi hoàn chỉnh.
        Áp dụng cache đối với câu hỏi đơn lẻ (không có history).
        """
        clean_msg = user_message.strip()
        diet_key = (dietary_type or "").strip().lower()
        cache_key = (clean_msg.lower(), diet_key)

        # Kiểm tra cache nếu là câu hỏi độc lập (không có lịch sử đàm thoại)
        if not history and cache_key in self._cache:
            return self._cache[cache_key]

        messages = self.build_messages(clean_msg, history=history, dietary_type=dietary_type)
        llm = get_llm_text()
        
        # Invoke LLM asynchronously
        response = await llm.ainvoke(messages)
        result = str(response.content)

        if not history:
            self._cache[cache_key] = result

        return result

    async def answer_stream(
        self,
        user_message: str,
        history: Optional[List[Any]] = None,
        dietary_type: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream câu trả lời của LLM theo từng token.
        """
        clean_msg = user_message.strip()
        messages = self.build_messages(clean_msg, history=history, dietary_type=dietary_type)
        llm = get_llm_text()

        async for chunk in llm.astream(messages):
            if chunk.content:
                yield str(chunk.content)


chatbot_agent = ChatbotAgent()

