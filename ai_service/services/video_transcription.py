# D:/SWP391/SWP391/ai_service/services/video_transcription.py
# Dịch vụ chép lời video: hiện chỉ dùng phụ đề tiếng Việt có sẵn trên YouTube, báo tiến độ qua callback.
from collections.abc import Awaitable, Callable

from schemas.video_recipe import VideoTranscript, VideoTranscriptionRequest
from services.video_captions import fetch_video_captions

# Callback nhận tên giai đoạn xử lý để phát sự kiện tiến độ.
ProgressCallback = Callable[[str], Awaitable[None]]


# Chép lời video và trả về bản chép lời theo hợp đồng chung.
async def transcribe_video(
    body: VideoTranscriptionRequest, progress: ProgressCallback
) -> VideoTranscript:
    """Keep the transcript contract while sourcing existing Vietnamese captions only."""
    await progress("FETCHING_CAPTIONS")
    return await fetch_video_captions(body)
