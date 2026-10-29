# ai_service/services/video_process.py
import asyncio
import os
import subprocess
import threading
from dataclasses import dataclass
from pathlib import Path

from core.video_recipe_errors import VideoRecipeError


@dataclass(frozen=True)
class ProcessLimits:
    timeout_seconds: float
    output_limit_bytes: int = 4_194_304
    directory: Path | None = None
    max_directory_bytes: int = 52_428_800


async def _read_bounded(stream: asyncio.StreamReader, limit: int) -> bytes:
    chunks, size = [], 0
    while chunk := await stream.read(65_536):
        size += len(chunk)
        if size > limit:
            raise VideoRecipeError(
                "VIDEO_MEDIA_LIMIT", "Dữ liệu xử lý âm thanh vượt giới hạn."
            )
        chunks.append(chunk)
    return b"".join(chunks)


async def _watch_directory(
    process: asyncio.subprocess.Process,
    limits: ProcessLimits,
    cancelled: threading.Event | None,
) -> None:
    while process.returncode is None:
        if cancelled is not None and cancelled.is_set():
            raise asyncio.CancelledError
        if limits.directory:
            size = sum(
                path.stat().st_size
                for path in limits.directory.iterdir()
                if path.is_file()
            )
            if size > limits.max_directory_bytes:
                raise VideoRecipeError(
                    "VIDEO_MEDIA_LIMIT", "Tệp âm thanh tải về vượt giới hạn."
                )
        await asyncio.sleep(0.1)


async def _terminate_process(process: asyncio.subprocess.Process) -> None:
    if process.returncode is not None:
        return
    if os.name == "nt":
        killer = await asyncio.create_subprocess_exec(
            "taskkill",
            "/PID",
            str(process.pid),
            "/T",
            "/F",
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        await killer.wait()
    if process.returncode is None:
        try:
            process.kill()
        except ProcessLookupError:
            pass
    await process.wait()


async def _start_process(arguments: list[str]) -> asyncio.subprocess.Process:
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    return await asyncio.create_subprocess_exec(
        *arguments,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        creationflags=flags,
    )


async def _run_video_process_native(
    arguments: list[str],
    limits: ProcessLimits,
    cancelled: threading.Event | None = None,
) -> str:
    process = await _start_process(arguments)
    tasks = [
        asyncio.create_task(_read_bounded(process.stdout, limits.output_limit_bytes)),
        asyncio.create_task(_read_bounded(process.stderr, limits.output_limit_bytes)),
        asyncio.create_task(process.wait()),
        asyncio.create_task(_watch_directory(process, limits, cancelled)),
    ]
    try:
        output, _, code, _ = await asyncio.wait_for(
            asyncio.gather(*tasks), limits.timeout_seconds
        )
        if code != 0:
            raise VideoRecipeError(
                "VIDEO_AUDIO_UNAVAILABLE", "Không lấy hoặc giải mã được âm thanh video."
            )
        return output.decode("utf-8", errors="replace")
    except TimeoutError as failure:
        raise VideoRecipeError(
            "VIDEO_MEDIA_TIMEOUT", "Xử lý âm thanh đã quá thời gian chờ.", status=504
        ) from failure
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.shield(_terminate_process(process))
        await asyncio.gather(*tasks, return_exceptions=True)


def _run_on_windows_loop(
    arguments: list[str], limits: ProcessLimits, cancelled: threading.Event
) -> str:
    with asyncio.Runner(loop_factory=asyncio.ProactorEventLoop) as runner:
        return runner.run(_run_video_process_native(arguments, limits, cancelled))


async def run_video_process(arguments: list[str], limits: ProcessLimits) -> str:
    """Keep Windows reload compatible while bounding and cancelling owned processes."""
    loop = asyncio.get_running_loop()
    if os.name != "nt" or isinstance(loop, asyncio.ProactorEventLoop):
        return await _run_video_process_native(arguments, limits)
    # Uvicorn reload uses a Selector loop on Windows, without subprocess support.
    cancelled = threading.Event()
    worker = asyncio.create_task(
        asyncio.to_thread(_run_on_windows_loop, arguments, limits, cancelled)
    )
    try:
        return await asyncio.shield(worker)
    except asyncio.CancelledError:
        cancelled.set()
        await asyncio.gather(worker, return_exceptions=True)
        raise
