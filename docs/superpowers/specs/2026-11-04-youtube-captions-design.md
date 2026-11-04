# YouTube captions instead of Groq

## Approved behavior

Replace Groq speech recognition entirely with `youtube-transcript-api`. Retrieve Vietnamese manual captions first, then Vietnamese automatically generated captions. When neither exists, return `VIDEO_CAPTIONS_UNAVAILABLE` with `Video chưa có phụ đề phù hợp`. Do not download audio, translate another language, invoke speech recognition, fabricate text, or fall back to Groq. Preserve the existing DeepSeek recipe generation, ownership, job retries, transcript checkpoints and 660-second video limit.

The user selected this approach and confirmed the missing-caption behavior on 2026-11-04. The alternatives were captions with a Groq fallback, or the existing audio-only implementation; neither matches the requested complete replacement.

## Architecture

The backend continues checking the canonical video URL, visibility and real video duration through metadata-only yt-dlp. Audio format availability is irrelevant. The worker requests the internal transcript stream with `jobId`, `videoId`, `videoUrl`, `maxDurationSeconds`, `durationSeconds` and `language`; remove the Whisper `model` field. Send metadata obtained during inspection explicitly to the transport, rather than using the stale claimed job snapshot.

The stream reports `FETCHING_CAPTIONS` before completion. Preserve bounded streaming, internal API authentication, cancellation, safe errors and validated transcript/recipe references. Add this stage to the PostgreSQL enum without deleting historical stages or records. Keep the current pipeline version and source deduplication; completed recipes and validated stored transcripts remain usable.

Python performs blocking caption requests off the FastAPI event loop with bounded HTTP requests. Caption snippets supply text/timestamps, not the full video duration: use the backend-verified duration and normalize overlapping caption timing without dropping text. Missing Vietnamese captions are a terminal source error; network/YouTube blocking errors are distinct sanitized failures. No keys, provider payloads or signed URLs appear in client errors.

## Phases and acceptance

1. Backend/schema: additive enum migration, caption progress/error transport, verified duration payload, metadata without audio requirements; targeted tests and backend regression checks on a separate `_test` database. Stop for user confirmation.
2. AI/frontend: implement captions, remove Groq and unused audio/STT modules, dependencies/settings and tests, remove Groq readiness gate, update progress text and preserve historical stage display. Test retrieval against the supplied video when reachable. Stop for user confirmation.
3. Tests/docs: finish cross-service regression coverage, README/environment/OpenAPI updates and real caption-only end-to-end verification. No DevOps changes.

Phase 1 changes the internal contract; the video feature is not ready end to end until Phase 2 is complete. Do not claim that Groq is fully removed before all phases finish.
