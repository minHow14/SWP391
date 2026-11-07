# D:/SWP391/SWP391/ai_service/services/image_moderation.py
import asyncio
import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import Runnable
from pydantic import ValidationError

from core.config import settings
from core.llm import get_llm_json
from schemas.image_moderation import (
    MAX_RESULT_OBSERVATIONS,
    ImageModerationRequest,
    ImageModerationResult,
    ImageModerationVerdict,
)
from services.content_moderation import moderation_failure

IMAGE_MODERATION_POLICY_VERSION = "vegetarian-community-image-v1"
IMAGE_MODERATION_MAX_TOKENS = 1_500
logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _image_moderation_prompt() -> str:
    return (
        Path(__file__).resolve().parents[1] / "prompts" / "image_moderation.md"
    ).read_text(encoding="utf-8")


@lru_cache(maxsize=1)
def _image_moderation_model() -> tuple[Runnable, str]:
    model = get_llm_json(
        timeout=settings.CONTENT_MODERATION_TIMEOUT_SECONDS
    ).model_copy(update={"max_tokens": IMAGE_MODERATION_MAX_TOKENS, "temperature": 0.0})
    return model.with_structured_output(
        ImageModerationVerdict, method="function_calling", include_raw=True
    ), model.model_name


def initialize_image_moderation() -> None:
    """Load the prompt and provider client once without requiring credentials for other features."""
    _image_moderation_prompt()
    if settings.DEEPSEEK_API_KEY:
        _image_moderation_model()


def _messages(body: ImageModerationRequest) -> list[SystemMessage | HumanMessage]:
    context = {
        "contentType": body.content_type,
        "title": body.title,
        "content": body.content,
        "imageIndex": body.image_index,
    }
    image_url = f"data:{body.mime_type};base64,{body.image_base64}"
    return [
        SystemMessage(content=_image_moderation_prompt()),
        HumanMessage(
            content=[
                {"type": "text", "text": json.dumps(context, ensure_ascii=False)},
                {"type": "image_url", "image_url": {"url": image_url}},
            ]
        ),
    ]


def _validated_result(
    packet: dict[str, Any], configured_model: str
) -> ImageModerationResult:
    if packet.get("parsing_error"):
        raise ValueError("Invalid structured image moderation output.")
    verdict = ImageModerationVerdict.model_validate(packet.get("parsed"))
    metadata = getattr(packet.get("raw"), "response_metadata", {}) or {}
    return ImageModerationResult(
        **verdict.model_dump(exclude={"observations"}),
        observations=verdict.observations[:MAX_RESULT_OBSERVATIONS],
        model_name=metadata.get("model_name") or configured_model,
        policy_version=IMAGE_MODERATION_POLICY_VERSION,
    )


async def moderate_image(body: ImageModerationRequest) -> ImageModerationResult:
    """Classify one post image with bounded real inference; failures never yield a verdict."""
    if not settings.DEEPSEEK_API_KEY:
        raise moderation_failure("MODERATION_AI_NOT_READY")
    try:
        model, configured_model = _image_moderation_model()
        async with asyncio.timeout(settings.CONTENT_MODERATION_TIMEOUT_SECONDS):
            packet = await model.ainvoke(_messages(body))
        return _validated_result(packet, configured_model)
    except TimeoutError as failure:
        raise moderation_failure("MODERATION_AI_TIMEOUT") from failure
    except (ValidationError, ValueError, TypeError, AttributeError) as failure:
        raise moderation_failure("MODERATION_AI_INVALID_OUTPUT", 502) from failure
    except Exception as failure:
        logger.warning(
            "Image moderation unavailable exceptionType=%s", type(failure).__name__
        )
        raise moderation_failure("MODERATION_AI_UNAVAILABLE") from failure
