# YouTube captions implementation plan

> **For agentic workers:** Use executing-plans inline, with test-driven implementation and a fresh code review at each completed phase. User-mandated phase confirmations take precedence over continuous execution.

**Goal:** Replace all Groq transcription with existing Vietnamese YouTube captions and report missing captions explicitly.

**Architecture:** Keep the existing authenticated job pipeline and DeepSeek recipe extraction. Change the transcript source, stage and source errors; preserve valid history and checkpoints.

**Tech Stack:** Express, Prisma/PostgreSQL, FastAPI/Pydantic v2, React, youtube-transcript-api.

**Spec:** `docs/superpowers/specs/2026-11-04-youtube-captions-design.md`.

## Global constraints

- Local services only; no DevOps, fake runtime data or direct Python database access.
- Vietnamese captions only, manual before automatic; no Groq fallback or translation.
- Missing-caption message: `Video chưa có phụ đề phù hợp`.
- CamelCase HTTP fields, internal authentication and 660-second duration bound remain.
- Preserve stored data with an additive stage migration; stop after each phase.

## Review focus

- Metadata without audio formats must remain usable for caption retrieval.
- A claimed job has stale metadata; pass the newly inspected duration explicitly.
- Missing-caption errors must remain terminal and prevent recipe generation.
- Stream completion without caption progress must be rejected; raw upstream messages stay private.
- Migration must support caption progress without invalidating existing history or leases.

## Phase 1: backend/schema

Files: `server/prisma/schema.prisma`, new generated migration, `server/src/constants/videoRecipeSummary.js`, `server/src/services/{youtubeMetadataService,videoRecipeSummaryAiService,videoRecipeSummaryProcessor}.js`, and corresponding tests.

- [x] Add failing metadata tests accepting missing/empty audio formats.
- [x] Update transport tests for `FETCHING_CAPTIONS`, a model-free payload containing verified `durationSeconds`, explicit caption errors, and old-stage rejection.
- [x] Add processor tests proving inspected metadata reaches caption retrieval and missing captions cannot reach summarization. Add a DB test persisting the new stage under a valid lease.
- [x] Run targeted tests and confirm the expected failures before implementation.
- [x] Remove audio-only metadata gating; use `transcribe({job, metadata, onStage, signal})` to send verified duration, consume caption progress and sanitize caption errors. Set the worker stage to `FETCHING_CAPTIONS`.
- [x] Add the enum stage, generate the migration through Prisma Migrate, inspect it, and apply it to development and isolated test databases without resets.
- [x] Run the eight-file `test:video-recipes` suite, then `npm test`, inspect all failures and review the diff.
- [x] Record evidence and stop for Phase 2 confirmation.

## Phase 2: AI/frontend

Files: `ai_service/services/video_transcription.py`, caption retrieval/normalization module if needed, request schema, API readiness checks, configuration/requirements, audio/STT modules and tests; frontend progress labels/tests.

- [x] Add tests for manual/automatic Vietnamese selection, missing captions, foreign-only captions, blocked/unavailable videos, timeout, nonfinite/out-of-bounds/overlapping snippets, empty text, size limits, cancellation and no Groq calls.
- [x] Implement `youtube-transcript-api` with pinned dependency, bounded off-loop execution and matching Phase 1 contract. Keep the existing transcript output shape and DeepSeek extraction.
- [x] Remove Groq settings, readiness gate and obsolete audio/STT code/dependencies. Keep yt-dlp metadata inspection in the backend.
- [x] Update the React progress label for `FETCHING_CAPTIONS`; retain legacy stage labels for historical records.
- [x] Run affected tests, lint/build checks and real caption retrieval for `mEZH98MSaLc`; review and stop for Phase 3 confirmation.

## Phase 3: verification/docs

- [x] Update README, `.env.example`, internal OpenAPI and video integration docs; identify captions as an unofficial interface and retain DeepSeek cost/configuration details.
- [x] Run backend/AI/frontend regression suites on isolated test state and report warnings/failures precisely.
- [x] Verify the normal job retry flow with captions and the no-Vietnamese-caption failure path; no runtime fake data or audio/STT fallback.
- [x] Review all Groq references; runtime dependencies/configuration must no longer require it. Preserve historical migration files and historical execution records.

## Execution ledger

- Phase 1 baseline: sandbox Vitest cache access caused ENOENT; rerun outside sandbox before assessing application failures. Existing checkout is used in place; no branch, commit or worktree mutation is needed for this change.
- Phase 1 evidence: baseline 38/38 focused tests passed; new behavior produced 10 expected RED failures. After implementation and migration, all 85/85 video tests passed. The metadata test table was clarified to separately cover omitted and empty audio formats; all 13/13 metadata tests then passed.
- Migration `20261104062755_add_video_caption_stage` was generated by `prisma migrate dev --create-only`, inspected (one additive enum value), applied through Migrate to `vegetarian_db` and `vegetarian_db_test`, and Prisma Client was regenerated. `prisma validate` and `git diff --check` passed; the CLI reports its existing package.json configuration deprecation warning.
- Independent read-only Phase 1 review: no actionable findings. AI/frontend/Groq removal and end-to-end compatibility remain explicitly deferred to Phase 2.
- Full-suite first invocation called Vitest directly: 491/492 passed; `seed compatibility with moderation migrations > uses CI database setup on an empty database and resets stale jobs on re-seed` failed because its npm subprocess requires `npm_execpath`, which is absent outside `npm test`. Rerun the suite using its prescribed npm entry point; no seed/CI code changes are needed.
- Phase 1 final verification: `npm test -- --reporter=dot --reporter=json --outputFile=...` passed all 492/492 tests across 58 files in 91.89 seconds. The seed test passes with npm's environment. Results: `docs/superpowers/2026-11-04-captions-backend-results.json`; full log: `docs/superpowers/2026-11-04-captions-backend-tests.log`. No unrelated seed or DevOps changes were made.
- Phase 1 complete. Await user confirmation before Phase 2; AI still contains the old Groq implementation and does not yet implement the new caption request contract.
- Phase 2 authorized by the user, explicitly requesting ponytail and Superpowers. Inline execution resumes the approved plan in the existing checkout; review is a separate read-only task. No additional worktree or commits are needed.
- Phase 2 baseline: 33/33 existing video AI tests passed. New schema/API assertions produced five expected RED failures; the new UI caption state produced one expected RED failure. Caption retrieval tests explicitly rejected the old audio subprocess path before replacement. Large parametrized content fixtures were given concise test IDs for Windows compatibility.
- Phase 2 implementation: pin/install `youtube-transcript-api==1.2.4`; add owned bounded requests.Session plus off-loop caption retrieval; normalize display-time overlaps and equal starts without dropping words. Remove Groq configuration, readiness gate, audio/process modules, obsolete audio tests, imageio-ffmpeg requirement and unused Groq response parser. Keep backend metadata-only yt-dlp and DeepSeek provider cooldown handling.
- Phase 2 security verification: an HTTP fixture pointing to a non-YouTube caption URL produced a RED test; the host/scheme/port/credentials guard made it GREEN. External requests are the only stubbed boundary; tests run the real transcript library's manual/auto selection and XML parser, and fail on audio subprocess creation.
- Phase 2 current checks: 48/48 targeted AI tests, all 299/299 AI tests, all 175/175 UI tests, all 129/129 frontend Node tests passed. Full AI Ruff check, changed-frontend ESLint and Vite production build passed. Existing SlowAPI Python deprecation warnings and Vite's >500 kB chunk warning remain.
- Real source verification: `mEZH98MSaLc` yielded Vietnamese captions in 1.11 seconds, 252 normalized segments and 8,157 characters over 629 seconds. After the development server reloaded, the actual backend transport called the running AI SSE endpoint and received `FETCHING_CAPTIONS` followed by a valid `vi`/629-second/252-segment transcript. No audio, Groq or DeepSeek call was needed.
- Phase 2 independent review found four Important issues, no Critical or Minor findings: redirect response bodies escaped the limit before Requests followed them; body timeouts were wrapped into generic connection errors; 64 KiB streaming reads could exceed the overall deadline under trickling responses; empty manual Vietnamese tracks prevented using an available automatic Vietnamese track.
- Phase 2 review fix pass: six failing regression cases reproduced these defects. Bound each response in a Requests response hook before redirect handling; consume available decoded bytes using urllib3 `read1` with deadline/cancellation checks; map body read timeouts explicitly; list native Vietnamese tracks once and try the automatic track only when the manual track is absent/empty. Invalid, blocked and network errors remain failures. Pin direct HTTP dependencies `requests==2.34.2`, `urllib3==2.8.0`; these match installed versions.
- Phase 2 final checks: all 55/55 targeted video tests and all 306/306 AI tests passed after the fix pass. AI-wide Ruff and formatting of all changed Python files passed; production functions remain within 30 lines. Frontend remains at 175/175 UI tests and 129/129 Node tests, with changed-file ESLint and Vite build passing. No frontend changes followed those runs. `git diff --check` passed. No unresolved review findings or deferred minors.
- Phase 2 live check after final edits: a request during dev reload ended before SSE events; after reload completed, the real backend-to-AI request again emitted `FETCHING_CAPTIONS` and returned Vietnamese transcript duration 629 seconds with 252 segments. This checked captions only, without changing job state or calling DeepSeek.
- Phase 2 complete; stop for user confirmation. Phase 3 still covers README/environment examples/OpenAPI and full job/DeepSeek end-to-end verification. Existing warning limits: five SlowAPI deprecations under Python 3.14 and Vite's large-chunk warning.
- Phase 3 authorized, interrupted at the user's explicit request for an API-usage/security audit, and resumed when the user requested completion. The security audit is separate; no GitHub history/key mutations belong to this implementation.
- Phase 3 docs: updated all three READMEs, both service environment examples, AI integration guide, backend video contract and public job OpenAPI. Added `docs/video-recipe-ai-openapi.json` using current Pydantic schemas. Root README still has all 14 required sections; both OpenAPI documents parse with all local references resolving (13 public, 15 internal). Setup explicitly invokes project-venv Python; obsolete audio/STT environment settings are removed from setup documentation.
- Phase 3 regression evidence: backend `npm test` passed 492/492 across 58 files; AI Pytest passed 306/306; frontend UI passed 175/175 and Node tests 129/129. Full AI Ruff and frontend ESLint/build passed. Existing warnings: five SlowAPI deprecations, two RestaurantMap hook dependency warnings, Vite >500 kB chunk warning. See `2026-11-04-captions-*-phase3-*.log` and backend JSON report in this directory.
- Live integration script `server/tests/videoRecipeSummaryCaptions.integration.mjs` uses guarded loopback `_test` DB, real Express routes/worker and real AI HTTP; creates and deletes only its own fixture account/cascading records. It independently verifies source failure if the positive provider case fails, records sanitized outcomes and exits nonzero on any failed assertion.
- Initial live attempt: correct-key retry saved 252 captions, but recipe generation failed. Fresh-process diagnosis confirmed DeepSeek HTTP 402 `insufficient_balance_error`; the missing-Vietnamese source case passed. User then replenished/reconfigured provider and requested resumption. A fresh Python process generated a real recipe; the long-running development AI still returned an unavailable-provider error. Restarted only the verified project-venv Uvicorn process tree to reload environment; no credential value was logged or changed.
- Final live run on 2026-11-04 at 17:22 UTC+7: both cases PASS, exit 0. Real internal-auth failure -> owned public `/retries` -> Vietnamese captions (252 segments / 629 seconds) -> DeepSeek recipe (24 steps) -> transactional persistence -> owned summary GET. Actual video `aqz-KE-bpKQ` returns exactly `VIDEO_CAPTIONS_UNAVAILABLE` / `Video chưa có phụ đề phù hợp`, without transcript/summary. Evidence: `2026-11-04-captions-live-results.json`, `2026-11-04-captions-live-resumed.log`.
- Phase 3 independent read-only review: no actionable Critical/Important/Minor findings; no deferred minors. Reviewer verified docs, syntax, reference integrity, test DB guard and fixture-only cleanup without paid provider/database calls. Final author verification confirms live results and cleanup separately. All phases complete; changes remain uncommitted in the user's current checkout, without push, merge, history rewrite or DevOps additions.
