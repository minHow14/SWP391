# D:/SWP391/SWP391/ai_service/services/ingredient_lookup.py
# Dịch vụ tra cứu thông tin nguyên liệu bằng LLM có đầu ra cấu trúc, kèm giới hạn thời gian và lỗi đã làm sạch.
import asyncio
import json
import logging
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import Runnable
from pydantic import ValidationError

from core.config import settings
from core.llm import get_structured_llm
from schemas.ingredient_lookup import IngredientLookupRequest, IngredientLookupResult

# Thời gian chờ tối đa cho một lượt tra cứu.
LOOKUP_TIMEOUT_SECONDS = 90.0
logger = logging.getLogger(__name__)


# Đọc prompt tra cứu từ file một lần rồi cache.
@lru_cache(maxsize=1)
def _lookup_prompt() -> str:
    return (
        Path(__file__).resolve().parents[1] / "prompts" / "ingredient_lookup.md"
    ).read_text(encoding="utf-8")


# Tạo LLM có đầu ra cấu trúc một lần rồi cache.
@lru_cache(maxsize=1)
def _lookup_model() -> Runnable:
    return get_structured_llm(IngredientLookupResult, timeout=LOOKUP_TIMEOUT_SECONDS)


# Cache prompt và client khi khởi động; không bắt buộc có khóa API của tính năng này.
def initialize_ingredient_lookup() -> None:
    """Cache the prompt and provider at startup without requiring this feature's key."""
    _lookup_prompt()
    if settings.DEEPSEEK_API_KEY:
        _lookup_model()


# Dựng message gửi LLM: tên nguyên liệu được gửi dạng JSON để tách bạch với chỉ thị.
def _lookup_messages(
    body: IngredientLookupRequest,
) -> list[SystemMessage | HumanMessage]:
    return [
        SystemMessage(content=_lookup_prompt()),
        HumanMessage(
            content=json.dumps(body.model_dump(by_alias=True), ensure_ascii=False)
        ),
    ]


# Dựng lỗi tra cứu đã làm sạch với mã lỗi và HTTP status cho trước.
def _failure(code: str, status: int) -> HTTPException:
    return HTTPException(
        status_code=status,
        detail={
            "code": code,
            "message": "Chưa thể tra cứu thông tin nguyên liệu. Vui lòng thử lại sau.",
        },
    )


# Sinh thông tin nguyên liệu đã validate; timeout trả 504, đầu ra sai trả 502, lỗi nhà cung cấp trả 503.
async def lookup_ingredient(body: IngredientLookupRequest) -> IngredientLookupResult:
    """Generate validated ingredient facts through bounded real provider inference."""
    if not settings.DEEPSEEK_API_KEY:
        raise _failure("INGREDIENT_LOOKUP_AI_NOT_READY", 503)
    try:
        model = _lookup_model()
        async with asyncio.timeout(LOOKUP_TIMEOUT_SECONDS):
            result = await model.ainvoke(_lookup_messages(body))
        return IngredientLookupResult.model_validate(result)
    except TimeoutError as failure:
        raise _failure("INGREDIENT_LOOKUP_AI_TIMEOUT", 504) from failure
    except (ValidationError, ValueError, TypeError, AttributeError) as failure:
        raise _failure("INGREDIENT_LOOKUP_AI_INVALID_OUTPUT", 502) from failure
    except Exception as failure:
        logger.warning(
            "Ingredient lookup unavailable exceptionType=%s", type(failure).__name__
        )
        raise _failure("INGREDIENT_LOOKUP_AI_UNAVAILABLE", 503) from failure
