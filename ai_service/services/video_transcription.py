# D:/SWP391/SWP391/ai_service/services/video_transcription.py
from collections.abc import Awaitable, Callable

from schemas.video_recipe import VideoTranscript, VideoTranscriptionRequest
from services.video_captions import fetch_video_captions

ProgressCallback = Callable[[str], Awaitable[None]]


async def transcribe_video(
    body: VideoTranscriptionRequest, progress: ProgressCallback
) -> VideoTranscript:
    """Keep the transcript contract while sourcing existing Vietnamese captions only."""
    await progress("FETCHING_CAPTIONS")
    return await fetch_video_captions(body)
