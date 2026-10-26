# D:/SWP391/SWP391/ai_service/tests/test_video_audio.py
import asyncio
import json
import sys
import wave
from pathlib import Path

import pytest

from core.video_recipe_errors import VideoRecipeError
from schemas.video_recipe import VideoTranscriptionRequest
from services.video_audio import prepare_video_audio
from services.video_process import ProcessLimits, run_video_process
from tests.test_video_recipe_schemas import request_payload


def write_wave(path: Path, duration: int = 1) -> None:
    with wave.open(str(path), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16000)
        audio.writeframes(b"\x01\x00" * 16000 * duration)


def fake_media(
    monkeypatch: pytest.MonkeyPatch,
    *,
    metadata_duration: int = 1,
    decoded_duration: int = 1,
) -> list:
    calls = []

    async def execute(arguments: list[str], limits: ProcessLimits) -> str:
        calls.append(arguments)
        if "--dump-single-json" in arguments:
            return json.dumps(
                {
                    "id": "AbCdEfGhI12",
                    "duration": metadata_duration,
                    "live_status": "not_live",
                    "availability": "public",
                }
            )
        if "--output" in arguments:
            Path(
                arguments[arguments.index("--output") + 1].replace("%(ext)s", "m4a")
            ).write_bytes(b"fixture-audio")
        else:
            write_wave(Path(arguments[-1]), decoded_duration)
        return ""

    monkeypatch.setattr("services.video_audio.run_video_process", execute)
    monkeypatch.setattr(
        "services.video_audio.ffmpeg_executable", lambda: "ffmpeg-fixture"
    )
    return calls


@pytest.mark.asyncio
async def test_prepares_bounded_pcm_and_cleans_temporary_files(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = fake_media(monkeypatch)
    async with prepare_video_audio(
        VideoTranscriptionRequest.model_validate(request_payload())
    ) as asset:
        assert asset.path.exists()
        assert asset.duration_seconds == 1
        assert asset.path.stat().st_size < 25_000_000
        directory = asset.path.parent
    assert not directory.exists()
    assert "--skip-download" in calls[0]
    assert "16000" in calls[-1]
    assert "pcm_s16le" in calls[-1]


@pytest.mark.asyncio
async def test_rejects_overlong_metadata_before_download(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = fake_media(monkeypatch, metadata_duration=661)
    with pytest.raises(VideoRecipeError, match="11 phút"):
        async with prepare_video_audio(
            VideoTranscriptionRequest.model_validate(request_payload())
        ):
            pytest.fail("Overlong video was accepted")
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_rejects_decoded_audio_longer_than_limit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_media(monkeypatch, decoded_duration=661)
    with pytest.raises(VideoRecipeError):
        async with prepare_video_audio(
            VideoTranscriptionRequest.model_validate(request_payload())
        ):
            pytest.fail("Overlong decoded audio was accepted")


@pytest.mark.asyncio
async def test_cleans_media_when_downstream_work_is_cancelled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_media(monkeypatch)
    directory = None
    with pytest.raises(asyncio.CancelledError):
        async with prepare_video_audio(
            VideoTranscriptionRequest.model_validate(request_payload())
        ) as asset:
            directory = asset.path.parent
            raise asyncio.CancelledError
    assert directory is not None and not directory.exists()


@pytest.mark.asyncio
async def test_subprocess_output_is_bounded() -> None:
    with pytest.raises(VideoRecipeError):
        await run_video_process(
            [sys.executable, "-c", "print('x' * 1000)"],
            ProcessLimits(timeout_seconds=5, output_limit_bytes=32),
        )


@pytest.mark.asyncio
async def test_subprocess_timeout_terminates_owned_process() -> None:
    with pytest.raises(VideoRecipeError) as failure:
        await run_video_process(
            [sys.executable, "-c", "import time; time.sleep(5)"],
            ProcessLimits(timeout_seconds=0.05),
        )
    assert failure.value.code == "VIDEO_MEDIA_TIMEOUT"
