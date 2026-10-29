# ai_service/api/video_recipe.py
import asyncio
import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

from core.security import verify_internal_api_key
from core.video_recipe_config import video_recipe_settings
from core.video_recipe_errors import VideoRecipeError
from schemas.video_recipe import (
    VideoSummaryRequest,
    VideoTranscript,
    VideoTranscriptionRequest,
)
from services.video_recipe import summarize_video
from services.video_transcription import transcribe_video

router = APIRouter(
    tags=["Video Recipes"], dependencies=[Depends(verify_internal_api_key)]
)
logger = logging.getLogger(__name__)


def _event(name: str, payload: dict) -> dict:
    return {"event": name, "data": json.dumps(payload, ensure_ascii=False)}


def _progress_event(stage: str) -> dict:
    return _event(
        "progress",
        {
            "success": True,
            "message": "Đang xử lý video.",
            "stage": stage,
            "data": {"stage": stage},
        },
    )


def _done_event(transcript: VideoTranscript) -> dict:
    return _event(
        "done",
        {
            "success": True,
            "message": "Đã nhận dạng toàn bộ video.",
            "data": {"transcript": transcript.model_dump(mode="json", by_alias=True)},
        },
    )


async def _produce(body: VideoTranscriptionRequest, queue: asyncio.Queue) -> None:
    async def progress(stage: str) -> None:
        await queue.put(_progress_event(stage))

    try:
        transcript = await transcribe_video(body, progress)
        await queue.put(_done_event(transcript))
    except VideoRecipeError as failure:
        await queue.put(_event("error", failure.envelope()))
    except Exception as failure:  # noqa: BLE001 -- Always terminate the SSE protocol safely.
        logger.error(
            "Video transcription failed exceptionType=%s", type(failure).__name__
        )
        await queue.put(
            _event(
                "error",
                VideoRecipeError(
                    "VIDEO_AI_UNAVAILABLE",
                    "Không thể hoàn tất nhận dạng video.",
                    status=503,
                ).envelope(),
            )
        )


async def _transcription_events(body: VideoTranscriptionRequest) -> AsyncIterator[dict]:
    queue: asyncio.Queue = asyncio.Queue(maxsize=8)
    producer = asyncio.create_task(_produce(body, queue))
    try:
        while True:
            event = await queue.get()
            yield event
            if event["event"] in {"done", "error"}:
                break
    finally:
        producer.cancel()
        await asyncio.gather(producer, return_exceptions=True)


@router.post("/video-recipe-transcriptions/stream")
async def transcribe_recipe_video(
    body: VideoTranscriptionRequest,
) -> EventSourceResponse:
    """Expose real progress and sanitized completion/error events to the worker."""
    if not video_recipe_settings.groq_api_key:
        raise VideoRecipeError(
            "VIDEO_AI_NOT_READY", "Chưa cấu hình khóa nhận dạng giọng nói.", status=503
        )
    return EventSourceResponse(_transcription_events(body), ping=15)


@router.post("/video-recipe-summaries")
async def create_video_recipe_summary(body: VideoSummaryRequest) -> dict:
    """Return the schema-validated recipe for the already complete transcript."""
    recipe = await summarize_video(body)
    return {
        "success": True,
        "message": "Đã tạo công thức từ video.",
        "data": {"recipe": recipe.model_dump(by_alias=True)},
    }


async def video_recipe_error_handler(
    request: Request, failure: VideoRecipeError
) -> JSONResponse:
    headers = (
        {"Retry-After": str((failure.retry_after_ms + 999) // 1000)}
        if failure.retry_after_ms
        else None
    )
    return JSONResponse(
        status_code=failure.status,
        content={
            **failure.envelope(),
            "meta": {"requestId": getattr(request.state, "request_id", None)},
        },
        headers=headers,
    )
