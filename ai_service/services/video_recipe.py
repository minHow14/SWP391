# D:/SWP391/SWP391/ai_service/services/video_recipe.py
import json
from functools import lru_cache
from pathlib import Path

import openai
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import ValidationError

from core.config import settings
from core.llm import get_structured_llm
from core.video_recipe_config import video_recipe_settings
from core.video_recipe_errors import VideoRecipeError
from schemas.video_recipe import VideoRecipe, VideoRecipeExtraction, VideoSummaryRequest
from services.video_provider import provider_rate_limit


@lru_cache(maxsize=1)
def _recipe_prompt() -> str:
    return (
        Path(__file__).resolve().parents[1] / "prompts" / "video_recipe.md"
    ).read_text(encoding="utf-8")


def _validated_recipe(
    extraction: VideoRecipeExtraction, body: VideoSummaryRequest
) -> VideoRecipe:
    if not extraction.is_recipe or extraction.recipe is None:
        raise VideoRecipeError(
            "VIDEO_NOT_RECIPE", "Lời nói trong video chưa đủ để tạo công thức nấu ăn."
        )
    items = [*extraction.recipe.ingredients, *extraction.recipe.steps]
    if any(
        index >= len(body.transcript.segments)
        for item in items
        for index in item.source_segment_indexes
    ):
        raise VideoRecipeError(
            "VIDEO_AI_INVALID_OUTPUT",
            "Công thức tham chiếu nội dung không có trong video.",
            status=502,
        )
    return extraction.recipe


def _recipe_messages(body: VideoSummaryRequest) -> list[SystemMessage | HumanMessage]:
    source = [
        {"index": index, "text": segment.text}
        for index, segment in enumerate(body.transcript.segments)
    ]
    return [
        SystemMessage(content=_recipe_prompt()),
        HumanMessage(content=json.dumps(source, ensure_ascii=False)),
    ]


async def summarize_video(body: VideoSummaryRequest) -> VideoRecipe:
    """Extract a grounded recipe from complete indexed transcript data only."""
    if not settings.DEEPSEEK_API_KEY:
        raise VideoRecipeError(
            "VIDEO_AI_NOT_READY", "Chưa cấu hình dịch vụ tạo công thức.", status=503
        )
    model = get_structured_llm(
        VideoRecipeExtraction,
        timeout=video_recipe_settings.video_summary_timeout_seconds,
    )
    try:
        extraction = await model.ainvoke(_recipe_messages(body))
        return _validated_recipe(VideoRecipeExtraction.model_validate(extraction), body)
    except openai.RateLimitError as failure:
        raise provider_rate_limit(failure.response.headers) from failure
    except (ValidationError, ValueError, TypeError) as failure:
        raise VideoRecipeError(
            "VIDEO_AI_INVALID_OUTPUT",
            "Dịch vụ AI trả về công thức không hợp lệ.",
            status=502,
        ) from failure
    except openai.APIError as failure:
        raise VideoRecipeError(
            "VIDEO_AI_UNAVAILABLE",
            "Dịch vụ tạo công thức tạm thời không khả dụng.",
            status=503,
        ) from failure
