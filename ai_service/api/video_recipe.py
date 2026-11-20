# D:/SWP391/SWP391/ai_service/api/video_recipe.py
# Router trích xuất công thức từ video YouTube: chép lời (SSE có tiến độ) và tóm tắt công thức.
import asyncio
import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

from core.security import verify_internal_api_key
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


# Đóng gói một sự kiện SSE với payload JSON (giữ nguyên ký tự tiếng Việt).
def _event(name: str, payload: dict) -> dict:
    return {"event": name, "data": json.dumps(payload, ensure_ascii=False)}


# Sự kiện tiến độ cho một giai đoạn xử lý.
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


# Sự kiện hoàn tất kèm bản chép lời.
def _done_event(transcript: VideoTranscript) -> dict:
    return _event(
        "done",
        {
            "success": True,
            "message": "Đã lấy phụ đề video.",
            "data": {"transcript": transcript.model_dump(mode="json", by_alias=True)},
        },
    )


# Task sản xuất: chép lời video và đẩy sự kiện tiến độ/kết quả/lỗi vào hàng đợi.
async def _produce(body: VideoTranscriptionRequest, queue: asyncio.Queue) -> None:
    async def progress(stage: str) -> None:
        await queue.put(_progress_event(stage))

    try:
        transcript = await transcribe_video(body, progress)
        await queue.put(_done_event(transcript))
    except VideoRecipeError as failure:
        await queue.put(_event("error", failure.envelope()))
    # Luôn kết thúc giao thức SSE an toàn bằng sự kiện error chung, không lộ chi tiết lỗi gốc.
    except Exception as failure:  # noqa: BLE001 -- Always terminate the SSE protocol safely.
        logger.error(
            "Video transcription failed exceptionType=%s", type(failure).__name__
        )
        await queue.put(
            _event(
                "error",
                VideoRecipeError(
                    "VIDEO_AI_UNAVAILABLE",
                    "Không thể lấy phụ đề video.",
                    status=503,
                ).envelope(),
            )
        )


# Generator SSE: phát sự kiện từ hàng đợi cho tới done/error; hàng đợi có giới hạn để tạo áp lực ngược.
async def _transcription_events(body: VideoTranscriptionRequest) -> AsyncIterator[dict]:
    queue: asyncio.Queue = asyncio.Queue(maxsize=8)
    producer = asyncio.create_task(_produce(body, queue))
    try:
        while True:
            event = await queue.get()
            yield event
            if event["event"] in {"done", "error"}:
                break
    # Hủy và chờ task sản xuất khi client ngắt kết nối hoặc stream kết thúc, tránh task mồ côi.
    finally:
        producer.cancel()
        await asyncio.gather(producer, return_exceptions=True)


# POST /api/video-recipe-transcriptions/stream: chép lời video, gửi tiến độ thật và sự kiện kết thúc đã làm sạch;
# ping 15 giây để giữ kết nối không bị proxy cắt khi xử lý lâu.
@router.post("/video-recipe-transcriptions/stream")
async def transcribe_recipe_video(
    body: VideoTranscriptionRequest,
) -> EventSourceResponse:
    """Expose real progress and sanitized completion/error events to the worker."""
    return EventSourceResponse(_transcription_events(body), ping=15)


# POST /api/video-recipe-summaries: tóm tắt công thức từ bản chép lời đã hoàn chỉnh.
@router.post("/video-recipe-summaries")
async def create_video_recipe_summary(body: VideoSummaryRequest) -> dict:
    """Return the schema-validated recipe for the already complete transcript."""
    recipe = await summarize_video(body)
    return {
        "success": True,
        "message": "Đã tạo công thức từ video.",
        "data": {"recipe": recipe.model_dump(by_alias=True)},
    }


# Handler toàn cục cho VideoRecipeError: trả body lỗi an toàn kèm header Retry-After (làm tròn lên theo giây).
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
