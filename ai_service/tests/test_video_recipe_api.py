# D:/SWP391/SWP391/ai_service/tests/test_video_recipe_api.py
# Kiểm thử API công thức từ video: luồng SSE chép phụ đề (/api/video-recipe-transcriptions/stream)
# và trích xuất công thức từ transcript bằng LLM (summarize_video).
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from core.video_recipe_errors import VideoRecipeError
from schemas.video_recipe import (
    VideoRecipeExtraction,
    VideoSummaryRequest,
    VideoTranscript,
)
from services.video_recipe import summarize_video
from tests.test_video_recipe_schemas import request_payload, transcript_payload


# Lấy payload JSON từ các dòng 'data:' của luồng SSE.
def parse_events(text: str) -> list[dict]:
    import json

    return [
        json.loads(line[5:].strip())
        for line in text.splitlines()
        if line.startswith("data:")
    ]


# Cả hai endpoint video đều yêu cầu khoá nội bộ.
def test_video_endpoints_require_internal_auth(client) -> None:
    assert (
        client.post(
            "/api/video-recipe-transcriptions/stream", json=request_payload()
        ).status_code
        == 401
    )
    assert client.post("/api/video-recipe-summaries", json={}).status_code == 401


# Luồng thành công: phát các giai đoạn tiến độ rồi sự kiện cuối chứa transcript đầy đủ.
def test_stream_stages_and_complete_transcript(
    client, internal_headers: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Giả lập dịch vụ chép phụ đề: báo giai đoạn rồi trả transcript mẫu.
    async def transcribe(body, progress):
        await progress("FETCHING_CAPTIONS")
        return VideoTranscript.model_validate(transcript_payload())

    monkeypatch.setattr("api.video_recipe.transcribe_video", transcribe)
    response = client.post(
        "/api/video-recipe-transcriptions/stream",
        json=request_payload(),
        headers=internal_headers,
    )
    assert response.status_code == 200
    events = parse_events(response.text)
    assert [item["stage"] for item in events[:-1]] == ["FETCHING_CAPTIONS"]
    assert events[-1]["data"]["transcript"] == transcript_payload()


# Video không có phụ đề -> sự kiện lỗi VIDEO_CAPTIONS_UNAVAILABLE và không có sự kiện done.
def test_stream_returns_missing_captions_without_completion(
    client, internal_headers: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Giả lập video không có phụ đề phù hợp.
    async def transcribe(body, progress):
        await progress("FETCHING_CAPTIONS")
        raise VideoRecipeError(
            "VIDEO_CAPTIONS_UNAVAILABLE", "Video chưa có phụ đề phù hợp"
        )

    monkeypatch.setattr("api.video_recipe.transcribe_video", transcribe)
    response = client.post(
        "/api/video-recipe-transcriptions/stream",
        json=request_payload(),
        headers=internal_headers,
    )
    assert response.status_code == 200
    assert parse_events(response.text)[-1]["errorCode"] == "VIDEO_CAPTIONS_UNAVAILABLE"
    assert parse_events(response.text)[-1]["message"] == "Video chưa có phụ đề phù hợp"
    assert "event: done" not in response.text


# Lấy phụ đề sẵn có không cần key nhận dạng giọng nói (Groq), nên thiếu key vẫn chạy được.
def test_caption_stream_does_not_require_a_speech_recognition_key(
    client, internal_headers: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    from types import SimpleNamespace

    monkeypatch.setattr(
        "api.video_recipe.video_recipe_settings",
        SimpleNamespace(groq_api_key=""),
        raising=False,
    )

    # Giả lập chép phụ đề thành công.
    async def transcribe(body, progress):
        await progress("FETCHING_CAPTIONS")
        return VideoTranscript.model_validate(transcript_payload())

    monkeypatch.setattr("api.video_recipe.transcribe_video", transcribe)
    response = client.post(
        "/api/video-recipe-transcriptions/stream",
        json=request_payload(),
        headers=internal_headers,
    )
    assert response.status_code == 200
    assert parse_events(response.text)[-1]["success"] is True


# Prompt gửi transcript kèm chỉ số đoạn; mỗi bước công thức phải tham chiếu đoạn có thật,
# tham chiếu sai (vd chỉ số 99) bị từ chối để chống LLM bịa nội dung.
@pytest.mark.asyncio
async def test_recipe_extraction_uses_indexed_source_and_checks_references(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recipe = {
        "title": "Nấm xào",
        "ingredients": [],
        "steps": [{"instruction": "Xào nấm chín.", "sourceSegmentIndexes": [0]}],
    }
    model = AsyncMock()
    model.ainvoke.return_value = VideoRecipeExtraction.model_validate(
        {"isRecipe": True, "recipe": recipe}
    )
    monkeypatch.setattr(
        "services.video_recipe.get_structured_llm", lambda *args, **kwargs: model
    )
    body = VideoSummaryRequest.model_validate(
        {
            "jobId": str(uuid4()),
            "videoId": "AbCdEfGhI12",
            "transcript": transcript_payload(),
        }
    )
    assert (await summarize_video(body)).model_dump(by_alias=True) == recipe
    assert '"index": 0' in model.ainvoke.call_args.args[0][1].content
    model.ainvoke.return_value.recipe.steps[0].source_segment_indexes = [99]
    with pytest.raises(VideoRecipeError):
        await summarize_video(body)


# Video không phải công thức nấu ăn -> lỗi VIDEO_NOT_RECIPE, không bịa ra công thức.
@pytest.mark.asyncio
async def test_non_recipe_speech_does_not_produce_an_invented_recipe(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    model = AsyncMock()
    model.ainvoke.return_value = VideoRecipeExtraction(is_recipe=False, recipe=None)
    monkeypatch.setattr(
        "services.video_recipe.get_structured_llm", lambda *args, **kwargs: model
    )
    body = VideoSummaryRequest.model_validate(
        {
            "jobId": str(uuid4()),
            "videoId": "AbCdEfGhI12",
            "transcript": transcript_payload(),
        }
    )
    with pytest.raises(VideoRecipeError) as failure:
        await summarize_video(body)
    assert failure.value.code == "VIDEO_NOT_RECIPE"
