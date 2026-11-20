# D:/SWP391/SWP391/ai_service/tests/test_video_recipe_schemas.py
# Kiểm thử schema Pydantic cho tính năng công thức từ video: hợp đồng camelCase với Back-end
# và các ràng buộc chặt về nguồn video, thời lượng, transcript.
from uuid import uuid4

import pytest
from pydantic import ValidationError

from schemas.video_recipe import (
    VideoSummaryRequest,
    VideoTranscript,
    VideoTranscriptionRequest,
)

# Mã video YouTube 11 ký tự hợp lệ dùng chung cho các test.
VIDEO_ID = "AbCdEfGhI12"


# Payload yêu cầu chép phụ đề hợp lệ (URL YouTube chuẩn khớp với videoId).
def request_payload() -> dict:
    return {
        "jobId": str(uuid4()),
        "videoId": VIDEO_ID,
        "videoUrl": f"https://www.youtube.com/watch?v={VIDEO_ID}",
        "maxDurationSeconds": 660,
        "durationSeconds": 60,
        "language": "vi",
    }


# Transcript hợp lệ mẫu gồm một đoạn nằm trong thời lượng video.
def transcript_payload() -> dict:
    return {
        "language": "vi",
        "durationSeconds": 60,
        "segments": [{"startSeconds": 0, "endSeconds": 30, "text": "Xào nấm chín."}],
    }


# Dump theo alias phải ra đúng payload camelCase mà Back-end gửi.
def test_contract_matches_backend_camel_case() -> None:
    body = VideoTranscriptionRequest.model_validate(request_payload())
    assert body.model_dump(mode="json", by_alias=True) == request_payload() | {
        "jobId": str(body.job_id)
    }
    assert VideoTranscript.model_validate(transcript_payload()).duration_seconds == 60


# Từ chối nguồn không chuẩn hoặc không hỗ trợ: domain giả mạo YouTube, videoId không khớp URL,
# vượt thời lượng tối đa, ngôn ngữ/model không hỗ trợ, thời lượng không hợp lệ, trường lạ.
@pytest.mark.parametrize(
    "patch",
    [
        {"videoUrl": "https://youtube.com.attacker.invalid/watch?v=AbCdEfGhI12"},
        {"videoId": "Different12"},
        {"maxDurationSeconds": 661},
        {"language": "en"},
        {"model": "whisper-large-v3"},
        {"durationSeconds": 0},
        {"durationSeconds": 661},
        {"durationSeconds": float("nan")},
        {"userId": 1},
    ],
)
def test_rejects_noncanonical_or_unsupported_sources(patch: dict) -> None:
    with pytest.raises(ValidationError):
        VideoTranscriptionRequest.model_validate(request_payload() | patch)


# Bắt buộc có thời lượng video đã xác minh để giới hạn chi phí xử lý.
def test_caption_request_requires_verified_video_duration() -> None:
    payload = request_payload()
    del payload["durationSeconds"]
    with pytest.raises(ValidationError):
        VideoTranscriptionRequest.model_validate(payload)


# Transcript không hợp lệ: quá thời lượng, rỗng, thời gian đảo ngược, vượt độ dài video, nội dung trắng.
@pytest.mark.parametrize(
    "patch",
    [
        {"durationSeconds": 661},
        {"segments": []},
        {"segments": [{"startSeconds": 10, "endSeconds": 5, "text": "Sai thời gian"}]},
        {"segments": [{"startSeconds": 0, "endSeconds": 61, "text": "Quá thời lượng"}]},
        {"segments": [{"startSeconds": 0, "endSeconds": 30, "text": " "}]},
    ],
)
def test_rejects_invalid_transcripts(patch: dict) -> None:
    with pytest.raises(ValidationError):
        VideoTranscript.model_validate(transcript_payload() | patch)


# Yêu cầu tóm tắt không cho phép ghi đè cấu hình provider (vd apiKey) từ phía client.
def test_summary_request_forbids_provider_and_owner_overrides() -> None:
    payload = {
        "jobId": str(uuid4()),
        "videoId": VIDEO_ID,
        "language": "vi",
        "transcript": transcript_payload(),
    }
    assert VideoSummaryRequest.model_validate(payload).video_id == VIDEO_ID
    with pytest.raises(ValidationError):
        VideoSummaryRequest.model_validate(payload | {"apiKey": "forbidden"})
