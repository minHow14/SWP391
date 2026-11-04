# D:/SWP391/SWP391/ai_service/services/video_captions.py
import asyncio
import math
import threading
import time
from typing import Any
from urllib.parse import urlsplit

import requests
from urllib3.exceptions import ReadTimeoutError
from youtube_transcript_api import (
    AgeRestricted,
    CouldNotRetrieveTranscript,
    FetchedTranscript,
    FetchedTranscriptSnippet,
    IpBlocked,
    NoTranscriptFound,
    PoTokenRequired,
    RequestBlocked,
    TranscriptsDisabled,
    VideoUnavailable,
    VideoUnplayable,
    YouTubeTranscriptApi,
)

from core.video_recipe_config import (
    CAPTION_READ_TIMEOUT_SECONDS,
    MAX_CAPTION_RESPONSE_BYTES,
    MAX_CAPTION_SEGMENTS,
    MAX_VIDEO_DURATION_SECONDS,
    video_recipe_settings,
)
from core.video_recipe_errors import VideoRecipeError
from schemas.video_recipe import (
    VideoSegment,
    VideoTranscript,
    VideoTranscriptionRequest,
)

SOURCE_FAILURES = (
    NoTranscriptFound,
    TranscriptsDisabled,
    RequestBlocked,
    IpBlocked,
    PoTokenRequired,
    VideoUnavailable,
    VideoUnplayable,
    AgeRestricted,
)


def missing_captions() -> VideoRecipeError:
    return VideoRecipeError(
        "VIDEO_CAPTIONS_UNAVAILABLE", "Video chưa có phụ đề phù hợp"
    )


def invalid_captions() -> VideoRecipeError:
    return VideoRecipeError(
        "VIDEO_AI_INVALID_OUTPUT",
        "Phụ đề video không hợp lệ hoặc vượt giới hạn.",
        status=502,
    )


def caption_timeout() -> VideoRecipeError:
    return VideoRecipeError(
        "VIDEO_CAPTIONS_TIMEOUT", "Lấy phụ đề video đã quá thời gian chờ.", status=504
    )


class CaptionSession(requests.Session):
    """Bound the transcript library's blocking HTTP work and own its cleanup."""

    def __init__(self, cancelled: threading.Event) -> None:
        super().__init__()
        self.cancelled = cancelled
        self.deadline = (
            time.monotonic() + video_recipe_settings.video_captions_timeout_seconds
        )
        self.hooks["response"].append(self._bounded_response)

    def check_active(self) -> float:
        if self.cancelled.is_set():
            raise asyncio.CancelledError
        remaining = self.deadline - time.monotonic()
        if remaining <= 0:
            raise caption_timeout()
        return min(CAPTION_READ_TIMEOUT_SECONDS, remaining)

    def send(
        self, request: requests.PreparedRequest, **kwargs: Any
    ) -> requests.Response:
        source = urlsplit(request.url)
        if (
            source.scheme != "https"
            or source.hostname
            not in {"www.youtube.com", "youtube.com", "consent.youtube.com"}
            or source.port not in {None, 443}
            or source.username
            or source.password
        ):
            raise invalid_captions()
        kwargs["timeout"] = self.check_active()
        kwargs["stream"] = True
        return super().send(request, **kwargs)

    def _bounded_response(
        self, response: requests.Response, **kwargs: Any
    ) -> requests.Response:
        try:
            self.check_active()
            # Response hooks run before Requests can consume bodies while redirecting.
            response._content = self._read_response(response)
            response._content_consumed = True
            return response
        finally:
            response.close()

    def _read_response(self, response: requests.Response) -> bytes:
        chunks, size = [], 0
        while True:
            self.check_active()
            chunk = response.raw.read1(65_536, decode_content=True)
            self.check_active()
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_CAPTION_RESPONSE_BYTES:
                raise invalid_captions()
            chunks.append(chunk)
        return b"".join(chunks)


def _caption_segment(
    snippet: FetchedTranscriptSnippet, duration: float
) -> VideoSegment:
    if (
        not math.isfinite(snippet.start)
        or not math.isfinite(snippet.duration)
        or not 0 <= snippet.start < duration
        or not 0 < snippet.duration <= MAX_VIDEO_DURATION_SECONDS
    ):
        raise invalid_captions()
    return VideoSegment(
        start_seconds=snippet.start,
        end_seconds=min(snippet.start + snippet.duration, duration),
        text=" ".join(snippet.text.split()),
    )


def _append_caption(segments: list[VideoSegment], segment: VideoSegment) -> None:
    if not segments:
        segments.append(segment)
        return
    previous = segments[-1]
    if segment.start_seconds < previous.start_seconds:
        raise invalid_captions()
    if segment.start_seconds == previous.start_seconds:
        segments[-1] = VideoSegment(
            start_seconds=previous.start_seconds,
            end_seconds=max(previous.end_seconds, segment.end_seconds),
            text=f"{previous.text} {segment.text}",
        )
        return
    previous.end_seconds = min(previous.end_seconds, segment.start_seconds)
    segments.append(segment)


def _normalize_captions(
    fetched: FetchedTranscript, body: VideoTranscriptionRequest
) -> VideoTranscript:
    if fetched.video_id != body.video_id or fetched.language_code != body.language:
        raise invalid_captions()
    if len(fetched) > MAX_CAPTION_SEGMENTS:
        raise invalid_captions()
    segments = []
    for snippet in fetched:
        if snippet.text.strip():
            _append_caption(segments, _caption_segment(snippet, body.duration_seconds))
    if not segments:
        raise missing_captions()
    return VideoTranscript(duration_seconds=body.duration_seconds, segments=segments)


def _source_failure(failure: Exception) -> VideoRecipeError:
    if isinstance(failure, (NoTranscriptFound, TranscriptsDisabled)):
        return missing_captions()
    if isinstance(failure, (RequestBlocked, IpBlocked, PoTokenRequired)):
        return VideoRecipeError(
            "VIDEO_CAPTIONS_BLOCKED",
            "YouTube đang chặn truy cập phụ đề. Vui lòng thử lại sau.",
            status=503,
        )
    return VideoRecipeError(
        "VIDEO_UNAVAILABLE", "Không thể truy cập video YouTube này."
    )


def _read_caption_tracks(
    api: YouTubeTranscriptApi, body: VideoTranscriptionRequest
) -> VideoTranscript:
    tracks = api.list(body.video_id)
    for find_track in (
        tracks.find_manually_created_transcript,
        tracks.find_generated_transcript,
    ):
        try:
            fetched = find_track([body.language]).fetch()
            return _normalize_captions(fetched, body)
        except NoTranscriptFound:
            continue
        except VideoRecipeError as failure:
            if failure.code != "VIDEO_CAPTIONS_UNAVAILABLE":
                raise
    raise missing_captions()


def _fetch_captions(
    body: VideoTranscriptionRequest, cancelled: threading.Event
) -> VideoTranscript:
    try:
        with CaptionSession(cancelled) as session:
            transcript = _read_caption_tracks(
                YouTubeTranscriptApi(http_client=session), body
            )
            session.check_active()
            return transcript
    except SOURCE_FAILURES as failure:
        raise _source_failure(failure) from failure
    except (requests.Timeout, ReadTimeoutError) as failure:
        raise caption_timeout() from failure
    except (requests.RequestException, CouldNotRetrieveTranscript) as failure:
        raise VideoRecipeError(
            "VIDEO_AI_UNAVAILABLE", "Không thể lấy phụ đề video.", status=503
        ) from failure
    except (ValueError, TypeError, AttributeError) as failure:
        raise invalid_captions() from failure


async def fetch_video_captions(body: VideoTranscriptionRequest) -> VideoTranscript:
    """Retrieve Vietnamese captions off-loop and drain owned work on cancellation."""
    cancelled = threading.Event()
    worker = asyncio.create_task(asyncio.to_thread(_fetch_captions, body, cancelled))
    try:
        return await asyncio.shield(worker)
    except asyncio.CancelledError:
        cancelled.set()
        await asyncio.gather(worker, return_exceptions=True)
        raise
