# D:/SWP391/SWP391/ai_service/services/content_moderation.py
# Dịch vụ kiểm duyệt nội dung văn bản bằng LLM: phân loại ALLOW/REVIEW và chỉ chấp nhận bằng chứng
# trích nguyên văn từ nội dung gốc; mọi lỗi đều trả về lỗi an toàn chung.
import asyncio
import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import Runnable
from pydantic import ValidationError

from core.config import settings
from core.llm import get_llm_json
from schemas.content_moderation import (
    ContentModerationRequest,
    ContentModerationResult,
    ContentModerationVerdict,
)

# Phiên bản chính sách kiểm duyệt, trả kèm kết quả để Backend biết kết luận dựa trên bộ quy tắc nào.
MODERATION_POLICY_VERSION = "vegetarian-community-v2"
# Giới hạn token đầu ra cho kết luận kiểm duyệt (đủ cho lý do và bằng chứng ngắn).
MODERATION_MAX_TOKENS = 1_500
logger = logging.getLogger(__name__)


# Đọc prompt kiểm duyệt từ file một lần rồi cache.
@lru_cache(maxsize=1)
def _moderation_prompt() -> str:
    return (
        Path(__file__).resolve().parents[1] / "prompts" / "content_moderation.md"
    ).read_text(encoding="utf-8")


# Tạo model kiểm duyệt một lần: temperature 0 để kết luận ổn định; include_raw để lấy tên model thật từ metadata.
@lru_cache(maxsize=1)
def _moderation_model() -> tuple[Runnable, str]:
    model = get_llm_json(
        timeout=settings.CONTENT_MODERATION_TIMEOUT_SECONDS
    ).model_copy(update={"max_tokens": MODERATION_MAX_TOKENS, "temperature": 0.0})
    return model.with_structured_output(
        ContentModerationVerdict, method="function_calling", include_raw=True
    ), model.model_name


# Khởi tạo khi service khởi động: nạp prompt và client một lần; không bắt buộc có khóa API để các tính năng khác vẫn chạy.
def initialize_content_moderation() -> None:
    """Load the prompt and provider client once without requiring credentials for other features."""
    _moderation_prompt()
    if settings.DEEPSEEK_API_KEY:
        _moderation_model()


# Dựng message gửi LLM: nội dung người dùng được gửi dưới dạng JSON để tách bạch với chỉ thị trong system prompt.
def _messages(body: ContentModerationRequest) -> list[SystemMessage | HumanMessage]:
    content = {
        "contentType": body.content_type,
        "title": body.title,
        "content": body.content,
    }
    return [
        SystemMessage(content=_moderation_prompt()),
        HumanMessage(content=json.dumps(content, ensure_ascii=False)),
    ]


# Validate kết quả của LLM và gắn tên model, phiên bản chính sách.
def _validated_result(
    packet: dict[str, Any], body: ContentModerationRequest, configured_model: str
) -> ContentModerationResult:
    if packet.get("parsing_error"):
        raise ValueError("Invalid structured moderation output.")
    verdict = ContentModerationVerdict.model_validate(packet.get("parsed"))
    # Mọi bằng chứng phải xuất hiện nguyên văn trong nội dung gửi lên, chống LLM bịa trích dẫn.
    source = f"{body.title or ''}\n{body.content}"
    if any(evidence not in source for evidence in verdict.evidence):
        raise ValueError("Moderation evidence is not in the supplied content.")
    metadata = getattr(packet.get("raw"), "response_metadata", {}) or {}
    return ContentModerationResult(
        **verdict.model_dump(),
        model_name=metadata.get("model_name") or configured_model,
        policy_version=MODERATION_POLICY_VERSION,
    )


# Dựng lỗi kiểm duyệt đã làm sạch, dùng chung cho endpoint văn bản và ảnh.
def moderation_failure(code: str, status: int = 503) -> HTTPException:
    """Build the sanitized moderation error shared by the text and image endpoints."""
    return HTTPException(
        status_code=status,
        detail={
            "code": code,
            "message": "Chưa thể hoàn tất kiểm duyệt tự động. Nội dung vẫn đang chờ xử lý.",
        },
    )


# Phân loại văn bản bằng một lượt suy luận thật có giới hạn thời gian, chỉ chấp nhận bằng chứng có căn cứ.
async def moderate_content(body: ContentModerationRequest) -> ContentModerationResult:
    # Timeout trả 503, đầu ra sai định dạng trả 502, lỗi khác trả 503; nội dung vẫn ở trạng thái chờ xử lý.
    """Classify submitted text with bounded real inference and grounded evidence only."""
    if not settings.DEEPSEEK_API_KEY:
        raise moderation_failure("MODERATION_AI_NOT_READY")
    try:
        model, configured_model = _moderation_model()
        async with asyncio.timeout(settings.CONTENT_MODERATION_TIMEOUT_SECONDS):
            packet = await model.ainvoke(_messages(body))
        return _validated_result(packet, body, configured_model)
    except TimeoutError as failure:
        raise moderation_failure("MODERATION_AI_TIMEOUT") from failure
    except (ValidationError, ValueError, TypeError, AttributeError) as failure:
        raise moderation_failure("MODERATION_AI_INVALID_OUTPUT", 502) from failure
    except Exception as failure:
        logger.warning(
            "Content moderation unavailable exceptionType=%s", type(failure).__name__
        )
        raise moderation_failure("MODERATION_AI_UNAVAILABLE") from failure
