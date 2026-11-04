# D:/SWP391/SWP391/ai_service/tests/test_video_transcription.py
import asyncio
import json
import threading
from io import BytesIO
from urllib.parse import parse_qs, urlsplit

import pytest
import requests
from requests.adapters import HTTPAdapter
from urllib3.response import HTTPResponse

from core.video_recipe_errors import VideoRecipeError
from schemas.video_recipe import VideoTranscriptionRequest
from services.video_transcription import transcribe_video
from tests.test_video_recipe_schemas import request_payload


def caption_track(language: str = "vi", *, generated: bool = False) -> dict:
    name = "automatic" if generated else "manual"
    return {
        "baseUrl": f"https://www.youtube.com/api/timedtext?track={name}",
        "languageCode": language,
        "name": {"runs": [{"text": language}]},
        "isTranslatable": True,
        **({"kind": "asr"} if generated else {}),
    }


def response_for(
    request: requests.PreparedRequest, content: bytes
) -> requests.Response:
    response = requests.Response()
    response.status_code = 200
    response.url = request.url
    response.request = request
    response.encoding = "utf-8"
    response.raw = HTTPResponse(body=BytesIO(content), preload_content=False)
    return response


def youtube_responses(monkeypatch: pytest.MonkeyPatch, **options) -> list:
    calls = []

    def send(adapter, request, **kwargs):
        calls.append((request, kwargs, threading.get_ident()))
        path = urlsplit(request.url).path
        if path == "/watch":
            content = b'{"INNERTUBE_API_KEY":"caption-test-key"}'
        elif path == "/youtubei/v1/player":
            data = {"playabilityStatus": options.get("playability", {"status": "OK"})}
            if options.get("tracks", True) is not None:
                data["captions"] = {
                    "playerCaptionsTracklistRenderer": {
                        "captionTracks": options.get("tracks", [caption_track()]),
                    }
                }
            content = json.dumps(data).encode()
        else:
            assert path == "/api/timedtext", "Only YouTube captions may be requested"
            track = parse_qs(urlsplit(request.url).query)["track"][0]
            content = options.get(
                f"{track}_xml",
                options.get(
                    "xml",
                    f'<transcript><text start="1" dur="4">{track}</text></transcript>',
                ),
            ).encode()
        return response_for(request, content)

    monkeypatch.setattr(HTTPAdapter, "send", send)
    return calls


@pytest.fixture(autouse=True)
def forbid_audio_processes(monkeypatch: pytest.MonkeyPatch) -> None:
    async def forbidden(*args, **kwargs):
        pytest.fail("Caption retrieval must not start an audio/STT subprocess")

    monkeypatch.setattr(asyncio, "create_subprocess_exec", forbidden)


async def retrieve() -> tuple:
    stages = []

    async def progress(stage: str) -> None:
        stages.append(stage)

    result = await transcribe_video(
        VideoTranscriptionRequest.model_validate(request_payload()), progress
    )
    return result, stages


@pytest.mark.asyncio
@pytest.mark.parametrize("manual", [True, False])
async def test_fetches_vietnamese_manual_before_automatic_off_the_event_loop(
    monkeypatch: pytest.MonkeyPatch,
    manual: bool,
) -> None:
    tracks = [caption_track(generated=True), caption_track("en")]
    if manual:
        tracks.append(caption_track())
    calls = youtube_responses(monkeypatch, tracks=tracks)
    result, stages = await retrieve()
    assert stages == ["FETCHING_CAPTIONS"]
    assert result.duration_seconds == 60
    assert result.segments[0].text == ("manual" if manual else "automatic")
    assert result.segments[0].start_seconds == 1
    assert result.segments[0].end_seconds == 5
    assert all(thread_id != threading.get_ident() for _, _, thread_id in calls)
    assert all(0 < options["timeout"] <= 5 for _, options, _ in calls)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "manual_xml",
    ["<transcript/>", '<transcript><text start="0" dur="1">  </text></transcript>'],
)
async def test_tries_automatic_vietnamese_when_manual_track_has_no_usable_text(
    monkeypatch: pytest.MonkeyPatch,
    manual_xml: str,
) -> None:
    calls = youtube_responses(
        monkeypatch,
        tracks=[caption_track(), caption_track(generated=True)],
        manual_xml=manual_xml,
    )
    result, _ = await retrieve()
    assert result.segments[0].text == "automatic"
    assert [
        parse_qs(urlsplit(call[0].url).query)["track"][0]
        for call in calls
        if urlsplit(call[0].url).path == "/api/timedtext"
    ] == ["manual", "automatic"]


@pytest.mark.asyncio
@pytest.mark.parametrize("tracks", [None, [], [caption_track("en")]])
async def test_missing_or_foreign_only_captions_fail_without_translation(
    monkeypatch: pytest.MonkeyPatch,
    tracks: list | None,
) -> None:
    calls = youtube_responses(monkeypatch, tracks=tracks)
    with pytest.raises(VideoRecipeError) as failure:
        await retrieve()
    assert failure.value.code == "VIDEO_CAPTIONS_UNAVAILABLE"
    assert failure.value.message == "Video chưa có phụ đề phù hợp"
    assert all("/api/timedtext" not in call[0].url for call in calls)


@pytest.mark.asyncio
async def test_normalizes_overlap_and_equal_starts_without_dropping_caption_text(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    youtube_responses(
        monkeypatch,
        xml='<transcript><text start="0" dur="10">Rửa nấm.</text>'
        '<text start="5" dur="8">Cắt nấm.</text><text start="5" dur="3">Để ráo.</text>'
        '<text start="58" dur="5">Xào chín.</text></transcript>',
    )
    result, _ = await retrieve()
    assert [(s.start_seconds, s.end_seconds, s.text) for s in result.segments] == [
        (0, 5, "Rửa nấm."),
        (5, 13, "Cắt nấm. Để ráo."),
        (58, 60, "Xào chín."),
    ]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "start,duration",
    [
        ("nan", "1"),
        ("inf", "1"),
        ("0", "nan"),
        ("0", "inf"),
        ("-1", "1"),
        ("60", "1"),
        ("0", "0"),
        ("0", "-1"),
    ],
)
async def test_rejects_invalid_caption_timestamps(
    monkeypatch: pytest.MonkeyPatch,
    start: str,
    duration: str,
) -> None:
    youtube_responses(
        monkeypatch,
        xml=f'<transcript><text start="{start}" dur="{duration}">Nấm.</text></transcript>',
    )
    with pytest.raises(VideoRecipeError) as failure:
        await retrieve()
    assert failure.value.code == "VIDEO_AI_INVALID_OUTPUT"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "xml,code",
    [
        (
            '<transcript><text start="0" dur="1">   </text></transcript>',
            "VIDEO_CAPTIONS_UNAVAILABLE",
        ),
        (
            '<transcript><text start="5" dur="1">Nấm.</text><text start="1" dur="1">Dầu.</text></transcript>',
            "VIDEO_AI_INVALID_OUTPUT",
        ),
        (
            '<transcript><text start="0" dur="1">'
            + "a" * 10_001
            + "</text></transcript>",
            "VIDEO_AI_INVALID_OUTPUT",
        ),
        (
            "<transcript>"
            + "".join(
                f'<text start="{i / 100}" dur="0.01">Nấm.</text>' for i in range(2001)
            )
            + "</transcript>",
            "VIDEO_AI_INVALID_OUTPUT",
        ),
        (
            "<transcript>"
            + "".join(
                f'<text start="{i}" dur="1">' + "a" * 9500 + "</text>"
                for i in range(11)
            )
            + "</transcript>",
            "VIDEO_AI_INVALID_OUTPUT",
        ),
    ],
    ids=[
        "empty",
        "out-of-order",
        "long-snippet",
        "too-many-snippets",
        "long-transcript",
    ],
)
async def test_rejects_empty_disordered_or_oversized_caption_content(
    monkeypatch: pytest.MonkeyPatch,
    xml: str,
    code: str,
) -> None:
    youtube_responses(monkeypatch, xml=xml)
    with pytest.raises(VideoRecipeError) as failure:
        await retrieve()
    assert failure.value.code == code


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "failure_case",
    [
        (
            "LOGIN_REQUIRED",
            "Sign in to confirm you’re not a bot",
            "VIDEO_CAPTIONS_BLOCKED",
        ),
        ("ERROR", "This video is unavailable", "VIDEO_UNAVAILABLE"),
    ],
)
async def test_distinguishes_blocking_from_unavailable_videos(
    monkeypatch: pytest.MonkeyPatch,
    failure_case: tuple,
) -> None:
    status, reason, code = failure_case
    youtube_responses(monkeypatch, playability={"status": status, "reason": reason})
    with pytest.raises(VideoRecipeError) as failure:
        await retrieve()
    assert failure.value.code == code
    assert reason not in failure.value.message


@pytest.mark.asyncio
async def test_network_timeout_is_sanitized(monkeypatch: pytest.MonkeyPatch) -> None:
    def timeout(*args, **kwargs):
        raise requests.Timeout("PRIVATE_PROVIDER_DETAIL")

    monkeypatch.setattr(HTTPAdapter, "send", timeout)
    with pytest.raises(VideoRecipeError) as failure:
        await retrieve()
    assert failure.value.code == "VIDEO_CAPTIONS_TIMEOUT"
    assert "PRIVATE_PROVIDER_DETAIL" not in failure.value.message


@pytest.mark.asyncio
async def test_bounds_response_bytes_before_parsing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        HTTPAdapter,
        "send",
        lambda adapter, request, **kwargs: response_for(request, b"x" * 4_194_305),
    )
    with pytest.raises(VideoRecipeError) as failure:
        await retrieve()
    assert failure.value.code == "VIDEO_AI_INVALID_OUTPUT"


@pytest.mark.asyncio
async def test_rejects_caption_urls_outside_youtube_before_sending(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    track = caption_track()
    track["baseUrl"] = "http://127.0.0.1/api/timedtext?track=manual"
    calls = youtube_responses(monkeypatch, tracks=[track])
    with pytest.raises(VideoRecipeError) as failure:
        await retrieve()
    assert failure.value.code == "VIDEO_AI_INVALID_OUTPUT"
    assert all(urlsplit(call[0].url).hostname == "www.youtube.com" for call in calls)


@pytest.mark.asyncio
async def test_cancellation_closes_owned_requests_and_stops_before_next_request(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    entered, release = threading.Event(), threading.Event()
    responses = []

    def send(adapter, request, **kwargs):
        entered.set()
        assert release.wait(2)
        response = response_for(request, b'{"INNERTUBE_API_KEY":"caption-test-key"}')
        responses.append(response)
        return response

    monkeypatch.setattr(HTTPAdapter, "send", send)
    task = asyncio.create_task(retrieve())
    reached_request = await asyncio.to_thread(entered.wait, 2)
    task.cancel()
    release.set()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert reached_request
    assert len(responses) == 1
    assert responses[0].raw.closed
