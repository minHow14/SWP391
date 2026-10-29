<!-- server/docs/videoRecipeSummaryBackend.md -->
# Video recipe summary backend — Phase 1

This phase provides authenticated job APIs, persistence and a local worker. FastAPI transcription/summarization and the chat UI are Phase 2. Until those endpoints exist, a valid video job reports `VIDEO_AI_NOT_READY`; no recipe is fabricated.

## Local prerequisites and startup

Use the existing PostgreSQL configuration and Node >=20. The metadata executable is yt-dlp with its default dependencies; enable a supported Node JavaScript runtime. No Docker, queue server or cloud storage is required.

From `D:\SWP391\SWP391\server`, in a Python environment with Python >=3.11:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-tools.txt
.\.venv\Scripts\yt-dlp.exe --version
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Set `YT_DLP_PATH` in local `server/.env` to the absolute path of `.venv/Scripts/yt-dlp.exe`, or activate the environment before starting the worker. `prisma migrate deploy` above uses the development DB in `.env`; the new migration only adds video-recipe tables, indexes and constraints. Never run test preparation against that DB.

In a second terminal, from the server directory:

```powershell
npm run worker:video-recipes
```

The worker processes one job at a time, renews its lease, recovers expired leases, and disconnects Prisma on SIGINT/SIGTERM. Jobs survive browser disconnects. Automatic retries are bounded; manual retry is an authenticated request on an owned FAILED job. Only one active job per account is permitted, including during retry backoff.

## Public API

All endpoints below require `Authorization: Bearer <access-token>`. Missing/invalid/expired credentials return 401 before any video inspection/provider call. Existing account-status checks apply. Unknown or foreign job/result identifiers return 404.

| Method | Path | Input/result |
| --- | --- | --- |
| POST | `/api/v1/video-recipe-summary-jobs` | Strict JSON `{videoUrl: string}`. Canonicalizes supported HTTPS YouTube watch/shorts/embed/youtu.be URLs. 202 for new or active job; 200 for completed same-account/source/version cache. |
| GET | `/api/v1/video-recipe-summary-jobs` | `page` default 1, `limit` default 10/max 100, optional status. Owned jobs only, createdAt/id ordering, envelope meta page/limit/total. Supports resuming after reload. |
| GET | `/api/v1/video-recipe-summary-jobs/:jobId` | Public job progress and summaryId. No transcript, lease token, raw provider data or userId. |
| POST | `/api/v1/video-recipe-summary-jobs/:jobId/retries` | Empty JSON body. Requeues an owned failed job and retains any complete transcript checkpoint. 202; an already completed job returns 200. |
| GET | `/api/v1/video-recipe-summaries/:summaryId` | Owned recipe, source URL/video ID, jobId and timestamps. |

Success envelope: `success`, `message`, `data`, `meta.requestId`; errors include `success:false`, `message`, `errorCode`, `errors`. IDs are UUID strings. Business timestamps are UTC ISO 8601; segment offsets are seconds from the start of the video.

Job states: PENDING, PROCESSING, COMPLETED, FAILED. Stages: VALIDATING_VIDEO, FETCHING_AUDIO, TRANSCRIBING, SUMMARIZING, SAVING_RESULT. Only COMPLETED means the recipe has been committed. Error codes include INVALID_YOUTUBE_URL, VIDEO_TOO_LONG, VIDEO_DURATION_UNKNOWN, VIDEO_UNAVAILABLE, VIDEO_AUDIO_UNAVAILABLE, VIDEO_INSPECTOR_UNAVAILABLE, VIDEO_JOB_ALREADY_ACTIVE, VIDEO_JOB_FAILED, VIDEO_AI_NOT_READY, VIDEO_AI_TIMEOUT, VIDEO_AI_RATE_LIMITED and VIDEO_AI_INVALID_OUTPUT.

A video's duration must be positive and <=660 seconds. Unknown duration, inaccessible sources, live streams, playlists and missing audio fail before AI processing. A page returning HTTP 200 is not sufficient validation. The inspector does not download media or run user-controlled shell text.

A metadata subprocess deadline reports VIDEO_METADATA_TIMEOUT and uses the bounded retry policy; it is not reported as a permanently inaccessible video. Worker cancellation/lease loss still takes precedence over subprocess timeout classification.

## Internal Phase 2 contract

Both calls are BE → FastAPI and require `X-Internal-Api-Key` matching `INTERNAL_API_KEY`. Redirects are rejected, response size is bounded, and the worker uses a separate video timeout. These endpoints are not implemented by Phase 1.

### POST `/api/video-recipe-transcriptions/stream`

JSON fields: jobId, videoId, videoUrl (canonical), maxDurationSeconds (660), model (`whisper-large-v3`), language (`vi`). AI must independently enforce byte/duration limits while fetching and decoding audio. It must finish all chunks and merge transcript content before sending done.

Response content type: text/event-stream. Events have `event:` and JSON `data:` lines separated by a blank line:

- `progress`: `{stage: "FETCHING_AUDIO"}` or `{stage: "TRANSCRIBING"}` reflecting actual activity. Stages cannot regress. TRANSCRIBING must be reported before done.
- `done`: `{success:true,data:{transcript}}`; transcript contains language `vi`, durationSeconds in (0,660], and nonempty ordered segments. Each segment has startSeconds, endSeconds and text; no segment may extend past durationSeconds. Total transcript text <=100000 characters, <=2000 segments, each segment <=10000 characters.
- `error`: `{errorCode, message}`. Known source codes VIDEO_TOO_LONG, VIDEO_NO_SPEECH, VIDEO_AUDIO_UNAVAILABLE, VIDEO_NOT_RECIPE map to safe backend messages. Other errors are sanitized. Never send provider keys, temporary file paths or raw stderr.

If provider quota is reached after streaming begins, emit `error` with errorCode `VIDEO_AI_RATE_LIMITED` and retryAfterMs as an integer in [0,2147483647]. Backend preserves that cooldown and sanitizes the message. Invalid cooldown values fail closed rather than causing an earlier retry.

Backend cancels the stream after validated done and persists a transcript checkpoint before requesting a recipe. Midstream errors/EOF do not result in a partial recipe.

`transcript.durationSeconds` must describe the full decoded audio, not the final chunk or the span containing speech. It must match the validated video metadata duration within two seconds (codec/container tolerance); the 660-second hard limit still applies independently. Both initial and resumed checkpoints are checked against saved source metadata. Speech need not fill the entire recording: gaps and trailing silence remain valid. A material mismatch reports `VIDEO_TRANSCRIPT_INCOMPLETE` before any summarization or complete checkpoint is saved.

### POST `/api/video-recipe-summaries`

JSON fields: jobId, videoId, language (`vi`), transcript (the complete checkpoint). AI uses its existing DeepSeek configuration and returns JSON `{success:true,data:{recipe}}`.

Recipe fields:

- title: nonempty string <=255 characters or null when unknown.
- ingredients: array <=100 items; each has name, quantity (string or null), unit (string or null), sourceSegmentIndexes (nonempty array of zero-based integer segment references).
- steps: 1–100 items; each has instruction (nonempty, <=4000 characters) and sourceSegmentIndexes.

Unknown fields and out-of-range references are rejected. Source references establish traceability, not a guarantee that a model's prose is correct; quality must be evaluated against real cooking videos. Do not invent quantities, timing, temperatures or nutritional information absent from speech.

HTTP 429 should include Retry-After. Worker delays by at least that duration or its configured minimum and gives up after VIDEO_JOB_MAX_ATTEMPTS automatic attempts. Internal 401/403 and missing endpoints are configuration failures rather than endlessly retried calls. A crash after provider success but before checkpoint persistence can repeat a request; this is not an exactly-once provider guarantee.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| YT_DLP_PATH | yt-dlp | Local executable path; never a shell command with arguments |
| VIDEO_METADATA_TIMEOUT_MS | 30000 | Metadata process timeout |
| VIDEO_AI_TIMEOUT_MS | 600000 | Deadline for each video AI call, not a promised processing time |
| VIDEO_JOB_LEASE_MS | 90000 | Worker lease; minimum 30000 |
| VIDEO_JOB_POLL_MS | 2000 | Idle database poll interval; minimum 250 |
| VIDEO_JOB_RETRY_MS | 30000 | Minimum automatic retry delay; minimum 1000 |
| VIDEO_JOB_MAX_ATTEMPTS | 3 | Automatic claim/recovery budget, allowed 1–5 |

The account's active slot and source/version uniqueness are enforced by PostgreSQL. Expired workers are fenced by leaseToken and expiry on every write. Completion and result insertion share one transaction. If DeepSeek fails after a saved transcript, retry skips Groq. No guest quota is consumed, and no other user's cached result is shared.

If the configured attempt budget is reduced, queued jobs that already reached the new limit are marked FAILED and release the account slot; they do not remain unclaimable forever. Their validated transcript checkpoint remains available for an explicit retry.

## Verification

Populate `server/.env.test` with a separate local DB whose name ends in `_test`. Never put secrets into commits. The existing test loader refuses databases without this suffix.

```powershell
npm run test:video-recipes
```

The tests create uniquely named users and clean up their own rows. Unit/provider doubles exist only in test files; production never returns those fixtures. Full provider/video quality verification belongs to Phase 2/3 with real user-supplied videos and API keys.
