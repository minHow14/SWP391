# D:/SWP391/SWP391/ai_service/tests/test_video_transcription.py
from pathlib import Path

import httpx
import pytest

from core.video_recipe_errors import VideoRecipeError
from services.video_audio import VideoAudioAsset
from services.video_transcription import groq_transcribe, normalize_groq_transcript


@pytest.mark.asyncio
async def test_sends_chosen_model_language_and_private_key(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "services.video_transcription.video_recipe_settings.groq_api_key",
        "test-only-groq-key",
    )
    audio = tmp_path / "audio.wav"
    audio.write_bytes(b"fixture-wave")

    async def handle(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer test-only-groq-key"
        assert request.url == "https://api.groq.com/openai/v1/audio/transcriptions"
        body = await request.aread()
        assert b"whisper-large-v3" in body and b'name="language"' in body
        assert b"verbose_json" in body and b"fixture-wave" in body
        return httpx.Response(
            200,
            json={
                "duration": 1,
                "segments": [{"start": 0, "end": 1, "text": "Xào nấm."}],
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
        result = await groq_transcribe(VideoAudioAsset(audio, 1), client)
    assert result.segments[0].text == "Xào nấm."


@pytest.mark.asyncio
async def test_rate_limit_preserves_provider_delay(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "services.video_transcription.video_recipe_settings.groq_api_key",
        "test-only-groq-key",
    )
    audio = tmp_path / "audio.wav"
    audio.write_bytes(b"fixture-wave")
    transport = httpx.MockTransport(
        lambda request: httpx.Response(429, headers={"Retry-After": "120"})
    )
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(VideoRecipeError) as failure:
            await groq_transcribe(VideoAudioAsset(audio, 1), client)
    assert failure.value.code == "VIDEO_AI_RATE_LIMITED"
    assert failure.value.retry_after_ms == 120_000


def test_does_not_confuse_last_speech_time_with_full_audio_duration() -> None:
    result = normalize_groq_transcript(
        {"duration": 60, "segments": [{"start": 0, "end": 10, "text": "Xào nấm."}]}, 60
    )
    assert result.duration_seconds == 60
    assert result.segments[0].end_seconds == 10


@pytest.mark.parametrize(
    "raw",
    [
        {
            "duration": 5,
            "segments": [{"start": 0, "end": 5, "text": "Một đoạn thiếu."}],
        },
        {"duration": 60, "segments": []},
        {
            "duration": 60,
            "segments": [
                {"start": 0, "end": 10, "text": "Im lặng", "no_speech_prob": 0.99}
            ],
        },
    ],
)
def test_rejects_partial_or_no_speech_output(raw: dict) -> None:
    with pytest.raises(VideoRecipeError):
        normalize_groq_transcript(raw, 60)
