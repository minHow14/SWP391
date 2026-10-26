# D:/SWP391/SWP391/ai_service/tests/test_video_recipe_schemas.py
from uuid import uuid4

import pytest
from pydantic import ValidationError

from schemas.video_recipe import VideoSummaryRequest, VideoTranscript, VideoTranscriptionRequest

VIDEO_ID = "AbCdEfGhI12"


def request_payload() -> dict:
    return {"jobId": str(uuid4()), "videoId": VIDEO_ID,
            "videoUrl": f"https://www.youtube.com/watch?v={VIDEO_ID}",
            "maxDurationSeconds": 660, "model": "whisper-large-v3", "language": "vi"}


def transcript_payload() -> dict:
    return {"language": "vi", "durationSeconds": 60,
            "segments": [{"startSeconds": 0, "endSeconds": 30, "text": "Xào nấm chín."}]}


def test_contract_matches_backend_camel_case() -> None:
    body = VideoTranscriptionRequest.model_validate(request_payload())
    assert body.model_dump(mode="json", by_alias=True) == request_payload() | {"jobId": str(body.job_id)}
    assert VideoTranscript.model_validate(transcript_payload()).duration_seconds == 60


@pytest.mark.parametrize("patch", [
    {"videoUrl": "https://youtube.com.attacker.invalid/watch?v=AbCdEfGhI12"},
    {"videoId": "Different12"}, {"maxDurationSeconds": 661}, {"language": "en"},
    {"model": "whisper-large-v3-turbo"}, {"userId": 1},
])
def test_rejects_noncanonical_or_unsupported_sources(patch: dict) -> None:
    with pytest.raises(ValidationError):
        VideoTranscriptionRequest.model_validate(request_payload() | patch)


@pytest.mark.parametrize("patch", [
    {"durationSeconds": 661}, {"segments": []},
    {"segments": [{"startSeconds": 10, "endSeconds": 5, "text": "Sai thời gian"}]},
    {"segments": [{"startSeconds": 0, "endSeconds": 61, "text": "Quá thời lượng"}]},
    {"segments": [{"startSeconds": 0, "endSeconds": 30, "text": " "}]},
])
def test_rejects_invalid_transcripts(patch: dict) -> None:
    with pytest.raises(ValidationError):
        VideoTranscript.model_validate(transcript_payload() | patch)


def test_summary_request_forbids_provider_and_owner_overrides() -> None:
    payload = {"jobId": str(uuid4()), "videoId": VIDEO_ID, "language": "vi", "transcript": transcript_payload()}
    assert VideoSummaryRequest.model_validate(payload).video_id == VIDEO_ID
    with pytest.raises(ValidationError):
        VideoSummaryRequest.model_validate(payload | {"apiKey": "forbidden"})
