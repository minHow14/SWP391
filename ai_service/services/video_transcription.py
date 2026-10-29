# ai_service/services/video_transcription.py
import math
from collections.abc import Awaitable, Callable

import httpx
from pydantic import ValidationError

from core.video_recipe_config import MAX_DURATION_DRIFT_SECONDS, video_recipe_settings
from core.video_recipe_errors import VideoRecipeError
from schemas.video_recipe import (
    VideoSegment,
    VideoTranscript,
    VideoTranscriptionRequest,
)
from services.video_audio import VideoAudioAsset, prepare_video_audio
from services.video_provider import provider_rate_limit, read_provider_json

ProgressCallback = Callable[[str], Awaitable[None]]
GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
MAX_NO_SPEECH_PROBABILITY = 0.8


def _normalized_segment(raw: dict, bounds: tuple[float, float]) -> VideoSegment | None:
    previous_end, duration = bounds
    text = raw.get("text", "").strip()
    if not text or float(raw.get("no_speech_prob", 0)) >= MAX_NO_SPEECH_PROBABILITY:
        return None
    start, end = float(raw["start"]), float(raw["end"])
    if not math.isfinite(start) or not math.isfinite(end):
        raise ValueError("Invalid segment timestamps")
    return VideoSegment(
        start_seconds=max(0, previous_end, start),
        end_seconds=min(duration, end),
        text=text,
    )


def normalize_groq_transcript(raw: dict, duration_seconds: float) -> VideoTranscript:
    """Validate full recording duration while allowing silence outside speech segments."""
    try:
        segments = _groq_segments(raw, duration_seconds)
        if not segments:
            raise VideoRecipeError(
                "VIDEO_NO_SPEECH", "Video không có đủ lời nói để tạo công thức."
            )
        return VideoTranscript(duration_seconds=duration_seconds, segments=segments)
    except (
        KeyError,
        TypeError,
        ValueError,
        AttributeError,
        ValidationError,
    ) as failure:
        raise VideoRecipeError(
            "VIDEO_AI_INVALID_OUTPUT",
            "Bản nhận dạng chưa đầy đủ hoặc không hợp lệ.",
            status=502,
        ) from failure


def _groq_segments(raw: dict, duration_seconds: float) -> list[VideoSegment]:
    reported_duration = float(raw["duration"])
    if (
        not math.isfinite(reported_duration)
        or abs(reported_duration - duration_seconds) > MAX_DURATION_DRIFT_SECONDS
    ):
        raise ValueError("Incomplete recording")
    if not isinstance(raw.get("segments"), list) or len(raw["segments"]) > 2000:
        raise ValueError("Invalid segment collection")
    segments = []
    for item in raw["segments"]:
        segment = _normalized_segment(
            item, (segments[-1].end_seconds if segments else 0, duration_seconds)
        )
        if segment:
            segments.append(segment)
    return segments


async def _call_groq(
    asset: VideoAudioAsset, client: httpx.AsyncClient
) -> VideoTranscript:
    fields = {
        "model": "whisper-large-v3",
        "language": "vi",
        "response_format": "verbose_json",
        "temperature": "0",
    }
    headers = {"Authorization": f"Bearer {video_recipe_settings.groq_api_key}"}
    with asset.path.open("rb") as audio:
        async with client.stream(
            "POST",
            GROQ_TRANSCRIPTION_URL,
            headers=headers,
            data=fields,
            files={"file": ("audio.wav", audio, "audio/wav")},
        ) as response:
            if response.status_code == 429:
                raise provider_rate_limit(response.headers)
            if response.status_code != 200:
                raise VideoRecipeError(
                    "VIDEO_AI_UNAVAILABLE",
                    "Dịch vụ nhận dạng âm thanh chưa sẵn sàng.",
                    status=503,
                )
            return normalize_groq_transcript(
                await read_provider_json(response), asset.duration_seconds
            )


async def groq_transcribe(
    asset: VideoAudioAsset, client: httpx.AsyncClient | None = None
) -> VideoTranscript:
    """Upload one bounded full WAV; the backend owns retries and provider cooldown."""
    if not video_recipe_settings.groq_api_key:
        raise VideoRecipeError(
            "VIDEO_AI_NOT_READY", "Chưa cấu hình khóa nhận dạng giọng nói.", status=503
        )
    try:
        if client is not None:
            return await _call_groq(asset, client)
        async with httpx.AsyncClient(
            timeout=video_recipe_settings.video_groq_timeout_seconds,
            follow_redirects=False,
        ) as own_client:
            return await _call_groq(asset, own_client)
    except httpx.HTTPError as failure:
        raise VideoRecipeError(
            "VIDEO_AI_UNAVAILABLE", "Không kết nối được dịch vụ nhận dạng.", status=503
        ) from failure


async def transcribe_video(
    body: VideoTranscriptionRequest, progress: ProgressCallback
) -> VideoTranscript:
    """Report actual media/STT stages and never return a partial transcript."""
    await progress("FETCHING_AUDIO")
    async with prepare_video_audio(body) as asset:
        await progress("TRANSCRIBING")
        return await groq_transcribe(asset)
