# D:/SWP391/SWP391/ai_service/services/video_captions.py
# Dịch vụ lấy phụ đề tiếng Việt có sẵn của video YouTube: giới hạn host, thời gian và dung lượng tải,
# chuẩn hóa các đoạn phụ đề thành dòng thời gian hợp lệ và ánh xạ lỗi thư viện sang VideoRecipeError an toàn.
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

# Các lỗi phía nguồn YouTube (không có phụ đề, bị chặn, video không xem được...) cần ánh xạ sang thông báo riêng.
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


# Lỗi 422: video không có phụ đề phù hợp.
def missing_captions() -> VideoRecipeError:
    return VideoRecipeError(
        "VIDEO_CAPTIONS_UNAVAILABLE", "Video chưa có phụ đề phù hợp"
    )


# Lỗi 502: phụ đề sai định dạng hoặc vượt giới hạn.
def invalid_captions() -> VideoRecipeError:
    return VideoRecipeError(
        "VIDEO_AI_INVALID_OUTPUT",
        "Phụ đề video không hợp lệ hoặc vượt giới hạn.",
        status=502,
    )


# Lỗi 504: lấy phụ đề quá thời gian chờ.
def caption_timeout() -> VideoRecipeError:
    return VideoRecipeError(
        "VIDEO_CAPTIONS_TIMEOUT", "Lấy phụ đề video đã quá thời gian chờ.", status=504
    )


# Session HTTP giới hạn công việc chặn (blocking) của thư viện phụ đề và tự quản lý việc dọn dẹp.
# Thư viện chạy trong thread riêng nên không thể hủy trực tiếp; session tự kiểm tra cờ hủy và hạn chót.
class CaptionSession(requests.Session):
    """Bound the transcript library's blocking HTTP work and own its cleanup."""

    # Khởi tạo với cờ hủy dùng chung và hạn chót tổng; gắn hook để đọc body có giới hạn.
    def __init__(self, cancelled: threading.Event) -> None:
        super().__init__()
        self.cancelled = cancelled
        self.deadline = (
            time.monotonic() + video_recipe_settings.video_captions_timeout_seconds
        )
        self.hooks["response"].append(self._bounded_response)

    # Ném lỗi nếu đã bị hủy hoặc hết hạn; trả về timeout cho lần đọc tiếp theo (không vượt thời gian còn lại).
    def check_active(self) -> float:
        if self.cancelled.is_set():
            raise asyncio.CancelledError
        remaining = self.deadline - time.monotonic()
        if remaining <= 0:
            raise caption_timeout()
        return min(CAPTION_READ_TIMEOUT_SECONDS, remaining)

    # Chỉ cho phép gửi request tới host YouTube qua HTTPS cổng chuẩn, không kèm thông tin đăng nhập,
    # để chặn chuyển hướng tới địa chỉ tùy ý (SSRF); luôn stream để kiểm soát kích thước body.
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

    # Hook response: đọc body có giới hạn rồi đóng kết nối ngay.
    def _bounded_response(
        self, response: requests.Response, **kwargs: Any
    ) -> requests.Response:
        try:
            self.check_active()
            # Hook response chạy trước khi Requests kịp đọc body trong lúc xử lý chuyển hướng.
            response._content = self._read_response(response)
            response._content_consumed = True
            return response
        finally:
            response.close()

    # Đọc body theo từng khối 64 KiB, dừng ngay khi vượt dung lượng tối đa hoặc bị hủy/hết hạn.
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


# Chuyển một đoạn phụ đề thành VideoSegment: loại giá trị vô hạn/ngoài thời lượng, cắt thời điểm kết thúc
# theo thời lượng video và gộp khoảng trắng thừa.
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


# Thêm đoạn vào danh sách theo thứ tự thời gian: gộp các đoạn cùng thời điểm bắt đầu,
# và cắt đoạn trước để không chồng lấn với đoạn mới.
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


# Kiểm tra phụ đề đúng video và ngôn ngữ yêu cầu, giới hạn số đoạn, rồi chuẩn hóa thành VideoTranscript.
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


# Ánh xạ lỗi nguồn YouTube sang VideoRecipeError thân thiện tương ứng.
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


# Ưu tiên phụ đề do người tạo video soạn, sau đó mới tới phụ đề tự động; phụ đề rỗng thì thử nguồn kế tiếp.
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


# Lấy phụ đề (chạy đồng bộ trong thread) và ánh xạ mọi loại lỗi thư viện/mạng sang VideoRecipeError.
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


# Lấy phụ đề tiếng Việt ngoài event loop; khi bị hủy thì báo cho thread dừng và chờ nó kết thúc hẳn.
async def fetch_video_captions(body: VideoTranscriptionRequest) -> VideoTranscript:
    """Retrieve Vietnamese captions off-loop and drain owned work on cancellation."""
    cancelled = threading.Event()
    worker = asyncio.create_task(asyncio.to_thread(_fetch_captions, body, cancelled))
    try:
        # shield giữ task thread không bị hủy đột ngột để có thể dọn dẹp có kiểm soát.
        return await asyncio.shield(worker)
    except asyncio.CancelledError:
        cancelled.set()
        await asyncio.gather(worker, return_exceptions=True)
        raise
