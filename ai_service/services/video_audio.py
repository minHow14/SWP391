# D:/SWP391/SWP391/ai_service/services/video_audio.py
import json
import sys
import wave
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from tempfile import TemporaryDirectory

from core.video_recipe_config import (
    MAX_DURATION_DRIFT_SECONDS,
    MAX_GROQ_UPLOAD_BYTES,
    MAX_VIDEO_DURATION_SECONDS,
    SAMPLE_RATE,
    video_recipe_settings,
)
from core.video_recipe_errors import VideoRecipeError
from schemas.video_recipe import VideoTranscriptionRequest
from services.video_process import ProcessLimits, run_video_process

YT_DLP_ARGUMENTS = [
    "--ignore-config",
    "--no-cache-dir",
    "--no-playlist",
    "--no-warnings",
    "--js-runtimes",
    "node",
    "--socket-timeout",
    "15",
    "--retries",
    "1",
    "--extractor-retries",
    "1",
]


@dataclass(frozen=True)
class VideoAudioAsset:
    path: Path
    duration_seconds: float


@lru_cache(maxsize=1)
def ffmpeg_executable() -> str:
    """Resolve the configured or bundled executable once per process."""
    import imageio_ffmpeg

    return video_recipe_settings.video_ffmpeg_path or imageio_ffmpeg.get_ffmpeg_exe()


async def _source_duration(body: VideoTranscriptionRequest) -> float:
    arguments = [
        sys.executable,
        "-m",
        "yt_dlp",
        *YT_DLP_ARGUMENTS,
        "--skip-download",
        "--dump-single-json",
        "--",
        body.video_url,
    ]
    output = await run_video_process(arguments, ProcessLimits(timeout_seconds=30))
    return _validated_source_duration(output, body)


def _validated_source_duration(output: str, body: VideoTranscriptionRequest) -> float:
    try:
        metadata = json.loads(output)
        duration = float(metadata["duration"])
    except (KeyError, TypeError, ValueError) as failure:
        raise VideoRecipeError(
            "VIDEO_AUDIO_UNAVAILABLE", "Không xác định được thời lượng video."
        ) from failure
    if metadata.get("id") != body.video_id or metadata.get("live_status") not in {
        "not_live",
        "was_live",
        "post_live",
    }:
        raise VideoRecipeError(
            "VIDEO_AUDIO_UNAVAILABLE", "Video chưa sẵn sàng để xử lý."
        )
    if (
        metadata.get("availability") not in {"public", "unlisted"}
        or not 0 < duration <= MAX_VIDEO_DURATION_SECONDS
    ):
        raise VideoRecipeError(
            "VIDEO_TOO_LONG", "Video phải truy cập được và dài không quá 11 phút."
        )
    return duration


async def _download(body: VideoTranscriptionRequest, directory: Path) -> Path:
    maximum = video_recipe_settings.video_max_download_bytes
    arguments = [
        sys.executable,
        "-m",
        "yt_dlp",
        *YT_DLP_ARGUMENTS,
        "--quiet",
        "--no-progress",
        "--abort-on-unavailable-fragments",
        "--max-filesize",
        str(maximum),
        "--format",
        "bestaudio",
        "--output",
        str(directory / "source.%(ext)s"),
        "--",
        body.video_url,
    ]
    limits = ProcessLimits(
        timeout_seconds=video_recipe_settings.video_download_timeout_seconds,
        directory=directory,
        max_directory_bytes=maximum,
    )
    await run_video_process(arguments, limits)
    return _downloaded_file(directory)


def _downloaded_file(directory: Path) -> Path:
    maximum = video_recipe_settings.video_max_download_bytes
    files = [
        path
        for path in directory.glob("source.*")
        if path.suffix not in {".part", ".ytdl"}
    ]
    if (
        len(files) != 1
        or files[0].is_symlink()
        or not 0 < files[0].stat().st_size <= maximum
    ):
        raise VideoRecipeError(
            "VIDEO_AUDIO_UNAVAILABLE", "Tệp âm thanh tải về không hợp lệ."
        )
    return files[0]


async def _decode(source: Path, target: Path) -> VideoAudioAsset:
    await run_video_process(
        _decode_arguments(source, target),
        ProcessLimits(
            timeout_seconds=video_recipe_settings.video_decode_timeout_seconds
        ),
    )
    return _validated_wave(target)


def _decode_arguments(source: Path, target: Path) -> list[str]:
    return [
        ffmpeg_executable(),
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-protocol_whitelist",
        "file,pipe",
        "-i",
        str(source),
        "-t",
        str(MAX_VIDEO_DURATION_SECONDS + 1),
        "-vn",
        "-ar",
        str(SAMPLE_RATE),
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        str(target),
    ]


def _validated_wave(target: Path) -> VideoAudioAsset:
    with wave.open(str(target), "rb") as audio:
        duration = audio.getnframes() / audio.getframerate()
        pcm_valid = (
            audio.getnchannels() == 1
            and audio.getsampwidth() == 2
            and audio.getframerate() == SAMPLE_RATE
        )
    if not pcm_valid or not 0 < duration <= MAX_VIDEO_DURATION_SECONDS:
        raise VideoRecipeError(
            "VIDEO_TOO_LONG", "Âm thanh phải có thời lượng không quá 11 phút."
        )
    if target.stat().st_size > MAX_GROQ_UPLOAD_BYTES:
        raise VideoRecipeError(
            "VIDEO_MEDIA_LIMIT", "Tệp âm thanh vượt giới hạn nhận dạng."
        )
    return VideoAudioAsset(target, duration)


@asynccontextmanager
async def prepare_video_audio(
    body: VideoTranscriptionRequest,
) -> AsyncIterator[VideoAudioAsset]:
    """Yield full bounded audio and remove private temporary assets on every exit."""
    with TemporaryDirectory(prefix="video-recipe-") as directory:
        root = Path(directory)
        duration = await _source_duration(body)
        source = await _download(body, root)
        asset = await _decode(source, root / "audio.wav")
        if abs(asset.duration_seconds - duration) > MAX_DURATION_DRIFT_SECONDS:
            raise VideoRecipeError(
                "VIDEO_AUDIO_UNAVAILABLE", "Âm thanh chưa khớp toàn bộ video."
            )
        yield asset
