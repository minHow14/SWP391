<!-- D:/SWP391/SWP391/server/docs/videoRecipeSummaryBackend.md -->
# YouTube recipe jobs and Vietnamese captions

The authenticated backend owns jobs, metadata validation, retries, transcript checkpoints and recipes. FastAPI retrieves existing native Vietnamese captions with youtube-transcript-api and sends the validated transcript to DeepSeek for recipe extraction. Audio downloading and STT are not part of this pipeline. Captions have no provider key or STT cost; recipe generation still requires a configured, billable DeepSeek account. The transcript library uses an unofficial YouTube interface and can be blocked or changed by YouTube.

## Local setup

Run PostgreSQL first, then AI, backend and frontend. From the repository root in PowerShell:

```powershell
cd ai_service
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Configure INTERNAL_API_KEY and DEEPSEEK_API_KEY before starting.
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Linux/macOS uses `./venv/bin/python`. In `server/.env`, set the same internal key and set `YT_DLP_PATH` to the absolute `ai_service/venv/Scripts/yt-dlp.exe` path (`venv/bin/yt-dlp` on Linux/macOS). It reads metadata only. In another terminal:

```powershell
cd server
npm ci --include=optional
npx prisma migrate deploy
npm run prisma:generate
npm run dev
```

The API starts a video worker automatically. `npm run worker:video-recipes` is optional for an additional worker; PostgreSQL leases fence concurrent claims. No external queue or deployment setup is needed. Migration `20261104062755_add_video_caption_stage` only adds `FETCHING_CAPTIONS` to the stage enum and preserves history.

## Public API

Every route requires Bearer authentication and ownership; unknown or foreign identifiers return 404. Each member may have one pending/processing video. Responses use the project's success/error envelope and UTC ISO 8601 timestamps.

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/v1/video-recipe-summary-jobs` | Strict `{videoUrl}`; 202 for new/active, 200 for a completed owned source/version. An existing failed source returns `409 VIDEO_JOB_FAILED`. |
| GET | `/api/v1/video-recipe-summary-jobs` | Owned history; page default 1, limit default 10/max 100; optional status and videoId. |
| GET | `/api/v1/video-recipe-summary-jobs/:jobId` | Safe progress, summaryId and errors; no transcript, lease token or internal owner ID. |
| POST | `/api/v1/video-recipe-summary-jobs/:jobId/retries` | Empty body; requeues an owned failed job, retains a valid transcript checkpoint; returns 202, or 200 if already complete. |
| GET | `/api/v1/video-recipe-summaries/:summaryId` | Persisted owned recipe and source; no provider call. |

Metadata must identify one accessible, non-live video with duration in `(0,660]`. Playlists, unsupported URLs, unknown duration and inaccessible sources fail before caption retrieval. Downloadable audio formats are irrelevant. New stages are `VALIDATING_VIDEO`, `FETCHING_CAPTIONS`, `SUMMARIZING`, `SAVING_RESULT`. The historical `FETCHING_AUDIO` and `TRANSCRIBING` enum values remain readable, but are not emitted by the caption pipeline. Only `COMPLETED` means the recipe transaction committed.

Public schemas: [AI gateway OpenAPI](../../docs/ai-openapi.json).

## Internal AI contract

Both endpoints require `X-Internal-Api-Key`. The backend rejects redirects and bounds response bytes. [Internal OpenAPI](../../docs/video-recipe-ai-openapi.json) describes the exact video request and response schemas; the running FastAPI schema is available at `/openapi.json`.

### POST `/api/video-recipe-transcriptions/stream`

Strict request fields: `jobId`, `videoId`, canonical `videoUrl`, `maxDurationSeconds` (660), `durationSeconds` (backend-verified full video duration), and `language` (`vi`). There is no model field or speech recognition key.

Content type is `text/event-stream`. Each event has `event:` and JSON `data:` lines separated by a blank line:

- `progress`: `stage=FETCHING_CAPTIONS` before completion.
- `done`: `success=true`, `data.transcript` with language `vi`, full `durationSeconds`, and ordered nonempty segments containing `startSeconds`, `endSeconds`, `text`.
- `error`: `success=false`, safe `message` and `errorCode`; no signed URLs, credentials or raw provider diagnostics.

The AI lists native Vietnamese tracks, uses a manual track first and tries the generated track if manual captions are absent or have no usable text. It never translates a foreign-language track or falls back to STT. Caption display times can overlap: earlier display intervals are clipped at the next start; equal-start text is merged without dropping words. Caption ends are clipped to the full video duration. Invalid ordering/timestamps/content fail closed. Limits remain 2,000 segments, 10,000 characters per segment and 100,000 characters total.

Caption HTTP responses are capped at 4 MiB, including redirect responses. Reads process available decoded data with cancellation/deadline checks; socket timeout is at most five seconds. Blocking library calls run off the FastAPI event loop, and cancellation drains their owned worker before returning.

Full video duration comes from verified metadata, not the final subtitle cue. Backend checks both new and resumed checkpoints against source metadata, allowing the existing two-second duration tolerance. Gaps and trailing silence are valid. A material mismatch fails with `VIDEO_TRANSCRIPT_INCOMPLETE` before summarization.

### POST `/api/video-recipe-summaries`

Strict request fields: `jobId`, `videoId`, `language=vi`, and the validated `transcript`. DeepSeek returns `data.recipe` with nullable `title`, `ingredients` (name, nullable quantity/unit, sourceSegmentIndexes), and nonempty `steps` (instruction, sourceSegmentIndexes). All source indexes must reference actual transcript segments. References provide traceability, not a guarantee of culinary accuracy; absent quantities/times/temperatures must not be invented.

DeepSeek rate limits use `VIDEO_AI_RATE_LIMITED` and Retry-After. The worker honors cooldowns and its bounded attempt budget. If recipe generation fails after a transcript checkpoint, manual retry reuses that checkpoint. A crash before checkpoint persistence may repeat a provider call; exactly-once inference is not promised.

## Errors and recovery

| Code | Behavior |
| --- | --- |
| `VIDEO_CAPTIONS_UNAVAILABLE` | Terminal source failure; message is `Video chưa có phụ đề phù hợp`. |
| `VIDEO_CAPTIONS_BLOCKED` | YouTube blocked access; distinct from missing captions; no automatic retry loop. |
| `VIDEO_CAPTIONS_TIMEOUT` | Caption retrieval timeout; bounded automatic retry. |
| `VIDEO_AI_UNAVAILABLE` / `VIDEO_AI_TIMEOUT` | Unavailable AI/network or backend deadline; bounded retry. |
| `VIDEO_AI_INVALID_OUTPUT` | Invalid or oversized transcript/recipe data; no fabricated result. |
| `VIDEO_METADATA_TIMEOUT` | Metadata deadline; retryable, distinct from an inaccessible video. |
| `VIDEO_JOB_FAILED` | Repeated create on failed source; call the owned job's `/retries` route. |

Start AI with the project venv, then restart backend/workers after schema/environment changes. `PENDING` needs a live worker against the right DB; `VALIDATING_VIDEO` needs yt-dlp; `FETCHING_CAPTIONS` needs accessible native Vietnamese captions. Keep saved history and do not seed/reset or requeue all jobs to repair a single failure.

## Configuration

| Service / variable | Default | Purpose |
| --- | --- | --- |
| BE `YT_DLP_PATH` | yt-dlp | Metadata executable, never a shell command with arguments |
| BE `VIDEO_METADATA_TIMEOUT_MS` | 30000 | Metadata process deadline |
| BE `VIDEO_AI_TIMEOUT_MS` | 600000 | Deadline per internal video AI call |
| BE `VIDEO_JOB_LEASE_MS` / `VIDEO_JOB_POLL_MS` | 90000 / 2000 | Lease and idle polling |
| BE `VIDEO_JOB_RETRY_MS` / `VIDEO_JOB_MAX_ATTEMPTS` | 30000 / 3 | Minimum retry delay and bounded attempts |
| AI `VIDEO_CAPTIONS_TIMEOUT_SECONDS` | 30 | Caption request budget, >0 to 120 seconds |
| AI `VIDEO_SUMMARY_TIMEOUT_SECONDS` | 120 | Recipe model timeout, >0 to 300 seconds |

The same `INTERNAL_API_KEY` is required on both services. `DEEPSEEK_API_KEY` belongs only to AI. Old audio/STT settings are unused and may be removed from local `.env` files.

## Verification

Ordinary suites use an isolated local database ending in `_test`, stub external providers only inside tests, and never call a paid provider:

```powershell
cd server
npm run test:video-recipes
npm test
```

The explicit live check uses actual YouTube captions and DeepSeek and writes only to the configured `_test` DB. With the project AI already running and keys/tool path configured in `server/.env`, run:

```powershell
node tests/videoRecipeSummaryCaptions.integration.mjs
```

It verifies an actual internal-auth failure followed by the public manual-retry route, real caption/recipe persistence and the no-Vietnamese-caption failure path. It cleans up only its own test account and cascading records. Do not run it while another suite/worker is using the test queue; it refuses a nonempty active queue. Live checks can consume DeepSeek quota; external source/provider failures must be reported, not replaced with canned results.
