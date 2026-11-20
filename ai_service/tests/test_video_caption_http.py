# D:/SWP391/SWP391/ai_service/tests/test_video_caption_http.py
# Kiểm thử tầng HTTP khi tải phụ đề video: giới hạn kích thước body (kể cả redirect), phân loại lỗi
# timeout/kết nối, thời hạn tổng và khả năng huỷ khi máy chủ trả dữ liệu nhỏ giọt.
import asyncio
import threading
import time
from io import BytesIO

import pytest
import requests
from requests.adapters import HTTPAdapter
from urllib3.response import HTTPResponse

from core.video_recipe_errors import VideoRecipeError
from tests.test_video_transcription import response_for, retrieve


# Body giả luôn ném TimeoutError khi đọc, mô phỏng socket hết thời gian giữa chừng.
class TimeoutBody(BytesIO):
    def read(self, size: int = -1) -> bytes:
        raise TimeoutError("PRIVATE_BODY_TIMEOUT")

    def read1(self, size: int = -1) -> bytes:
        return self.read(size)


# Body giả trả từng byte chậm (nhỏ giọt) để kiểm tra thời hạn tổng và việc huỷ tác vụ;
# entered được set khi bắt đầu đọc để test biết lúc nào việc tải đã bắt đầu.
class SlowBody(BytesIO):
    def __init__(self, content: bytes, entered: threading.Event) -> None:
        super().__init__(content)
        self.entered = entered

    def read(self, size: int = -1) -> bytes:
        self.entered.set()
        time.sleep(0.01)
        return super().read(1)

    def read1(self, size: int = -1) -> bytes:
        return self.read(size)


# Tạo response giả với body tuỳ chỉnh, thay raw stream mặc định bằng body đã cho.
def response_with_body(
    request: requests.PreparedRequest, body: BytesIO
) -> requests.Response:
    response = response_for(request, b"")
    response.raw.close()
    response.raw = HTTPResponse(body=body, preload_content=False)
    return response


# Body của response redirect quá lớn bị chặn trước khi requests kịp đi theo redirect (chỉ một lần gọi).
@pytest.mark.asyncio
async def test_bounds_redirect_body_before_requests_can_follow_it(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = []

    # Lần gọi đầu trả 302 kèm body vượt giới hạn 4 MiB; lần sau (nếu có) trả trang không phải video.
    def send(adapter, request, **kwargs):
        calls.append(request.url)
        if len(calls) == 1:
            response = response_for(request, b"x" * 4_194_305)
            response.status_code = 302
            response.headers["Location"] = "https://www.youtube.com/next"
            return response
        return response_for(request, b"not-a-video-page")

    monkeypatch.setattr(HTTPAdapter, "send", send)
    with pytest.raises(VideoRecipeError) as failure:
        await retrieve()
    assert failure.value.code == "VIDEO_AI_INVALID_OUTPUT"
    assert len(calls) == 1


# Timeout khi đọc body vẫn được báo là VIDEO_CAPTIONS_TIMEOUT, không lộ chi tiết lỗi nội bộ.
@pytest.mark.asyncio
async def test_body_socket_timeout_keeps_the_caption_timeout_code(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        HTTPAdapter,
        "send",
        lambda adapter, request, **kwargs: response_with_body(request, TimeoutBody()),
    )
    with pytest.raises(VideoRecipeError) as failure:
        await retrieve()
    assert failure.value.code == "VIDEO_CAPTIONS_TIMEOUT"
    assert "PRIVATE_BODY_TIMEOUT" not in failure.value.message


# Lỗi kết nối chung không bị báo nhầm thành timeout mà là VIDEO_AI_UNAVAILABLE.
@pytest.mark.asyncio
async def test_generic_connection_failure_is_not_misreported_as_timeout(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def send(*args, **kwargs):
        raise requests.ConnectionError("PRIVATE_CONNECTION_FAILURE")

    monkeypatch.setattr(HTTPAdapter, "send", send)
    with pytest.raises(VideoRecipeError) as failure:
        await retrieve()
    assert failure.value.code == "VIDEO_AI_UNAVAILABLE"
    assert "PRIVATE_CONNECTION_FAILURE" not in failure.value.message


# Máy chủ trả dữ liệu nhỏ giọt không thể kéo dài quá thời hạn tổng đã cấu hình.
@pytest.mark.asyncio
async def test_slow_trickling_body_cannot_extend_the_total_deadline(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    entered = threading.Event()
    monkeypatch.setattr(
        "core.video_recipe_config.video_recipe_settings.video_captions_timeout_seconds",
        0.03,
    )
    monkeypatch.setattr(
        HTTPAdapter,
        "send",
        lambda adapter, request, **kwargs: response_with_body(
            request, SlowBody(b"x" * 40, entered)
        ),
    )
    started = time.monotonic()
    with pytest.raises(VideoRecipeError) as failure:
        await retrieve()
    elapsed = time.monotonic() - started
    assert failure.value.code == "VIDEO_CAPTIONS_TIMEOUT"
    assert elapsed < 0.25


# Huỷ tác vụ phải dừng ngay, không đợi body nhỏ giọt lấp đầy một chunk.
@pytest.mark.asyncio
async def test_cancellation_does_not_wait_for_a_trickling_body_to_fill_a_chunk(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    entered = threading.Event()
    monkeypatch.setattr(
        HTTPAdapter,
        "send",
        lambda adapter, request, **kwargs: response_with_body(
            request, SlowBody(b"x" * 40, entered)
        ),
    )
    task = asyncio.create_task(retrieve())
    assert await asyncio.to_thread(entered.wait, 2)
    started = time.monotonic()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert time.monotonic() - started < 0.25
