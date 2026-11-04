# Frontend Repairs — Phase 1 Backend Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans task by task. Steps use checkbox syntax for tracking.

**Goal:** Repair existing backend contracts and profile persistence required by the frontend audit.

**Architecture:** Keep the existing Express/Prisma architecture and database schema. Reuse canonical status constants, protect the dedicated account restoration flow, and share weight-history synchronization between profile update endpoints.

**Tech Stack:** Existing Node.js, Express, Zod, Prisma, PostgreSQL, Vitest and Supertest.

**Spec:** `D:/SWP391/SWP391/docs/frontend-audit-2026-11-03.md`, approved for repair by the user's “sửa đi”.

## Global Constraints

- One branch: `fix-frontend`; separate conventional commits for independent functions.
- Work in the existing checkout selected by the user; preserve unrelated untracked files.
- No schema migration, new dependency, fabricated runtime data, DevOps or deployment changes.
- Test fixtures belong only in tests. Integration tests must load `.env.test` and enforce a database name ending in `_test`.
- First-line path comments in changed code; use full paths in user-facing file lists.
- Complete Phase 1, then stop for confirmation before Phase 2 as explicitly required by root AGENTS.md.

## Review Focus

- Reject invalid account/report states without accepting obsolete enum values.
- Generic account activation must preserve deletion metadata and leave cascaded content deleted until explicit restoration.
- Restoration must preserve previously deleted unrelated content.
- A repeated unchanged weight must not add duplicate history; a changed weight must store BMI calculated from the saved height.
- Profile, preferences and history must remain in the same transaction; an error must roll everything back.

## Task 1: Member status validation

**Files:**
- Modify `D:/SWP391/SWP391/server/src/validators/admin.validator.js`.
- Create `D:/SWP391/SWP391/server/tests/adminUserStatusContract.test.js`.

**Interface:** `updateUserStatusSchema` accepts ACTIVE, LOCKED and DELETED, rejecting BANNED, PENDING, unknown status and extra fields.

- [x] Write and run the failing contract regression before changing production code.
- [x] Replace the divergent enum with canonical USER_STATUS values.
- [x] Run the focused regression; commit as `fix(admin-members): accept canonical account statuses`.

## Task 2: Report status validation

**Files:**
- Modify `D:/SWP391/SWP391/server/src/validators/admin.validator.js`.
- Create `D:/SWP391/SWP391/server/tests/adminReportStatusContract.test.js`.

**Interface:** `updateReportStatusSchema` accepts PENDING, RESOLVED and DISMISSED, preserving resolutionAction validation and rejecting REJECTED.

- [x] Write and run the failing report regression.
- [x] Use canonical REPORT_STATUS values; run both status contract files.
- [x] Commit as `fix(admin-reports): accept canonical dismissal status`.

## Task 3: Preserve account restoration metadata

**Files:**
- Modify `D:/SWP391/SWP391/server/src/services/admin.service.js`.
- Create `D:/SWP391/SWP391/server/tests/adminAccountRestore.test.js`.

**Interface:** Generic PATCH status cannot reactivate a deleted account; it returns 409 and preserves deleted_at. Existing POST restore reactivates the account and only the content deleted with it.

- [x] Write an API regression creating isolated account/post/comment fixtures in the test DB; verify PATCH activation currently erases deletion metadata.
- [x] Add a guard directing deleted-account state transitions to explicit restoration.
- [x] Verify normal lock/unlock, protected deleted state, and explicit selective restoration.
- [x] Commit as `fix(admin-members): preserve deleted account restoration metadata`.

## Task 4: Synchronize journal profile weight history

**Files:**
- Create `D:/SWP391/SWP391/server/src/services/healthProfileService.js`.
- Modify `D:/SWP391/SWP391/server/src/services/auth.service.js`.
- Modify `D:/SWP391/SWP391/server/src/services/workspace.service.js`.
- Create `D:/SWP391/SWP391/server/tests/journalProfileHistory.test.js`.

**Interface:** Shared `syncHealthProfileWeightHistory(userId, profile, tx)` persists a changed profile weight and calculated BMI through userRepository, using the caller transaction. Both auth and workspace profile updates invoke it. No duplicate history for unchanged weight, no record for null weight; preserve existing API response shapes.

- [x] Reproduce missing history through PATCH workspace/profile and GET auth/me/health-history.
- [x] Extract the existing synchronization into the shared service and invoke it from workspace's existing transaction.
- [x] Cover updated BMI, unchanged weight, both profile endpoints and transaction rollback.
- [x] Commit as `fix(journal): synchronize profile edits with weight history`.

## Completion

- [x] Run backend suite against `_test`, inspect every failure, and record any environment limits.
- [x] Request one independent review of Phase 1; resolve important findings within this phase with regression checks.
- [x] Record commits and checks in `D:/SWP391/SWP391/docs/frontend-repairs-phase1.md`.
- [ ] Receive confirmation for Phase 2, required by root AGENTS.md line 107.

## Deferred to Phase 2/3

Frontend-only fixes include credentials disclosure, refresh/logout wiring, restore caller, media normalization, pagination, category controls, scanner UI/state, quota/log controls, chat photo/BMI and restaurant sorting. Diet contracts must change together with AI schemas/prompts and frontend mapping; the existing four-value backend contract remains unchanged in Phase 1 to avoid enabling inputs the AI cannot yet consume. Forgotten-password delivery and legal content require real business information; do not invent them.

## Progress

- Started on `fix-frontend`, base commit `03b2852`; existing untracked community-image-sources.md and docs/superpowers content remain untouched except this new plan.
- Ruling: the user already authorized repairs to the written audit; proceed without an additional design approval gate. Honor the explicit project phase boundary.
- Baseline: full backend suite passed, 395 tests / 47 files.
- Task 1 complete: `9c2dda0`; 8 contract tests GREEN after 3 expected RED failures.
- Task 2 complete: `5e03515`; 15 combined contract tests GREEN after 2 expected report failures.
- Task 3 complete: `53abe81`; review follow-up `96c097c` serializes account lifecycle mutations and makes DELETE idempotent, with RED→GREEN API regressions. Ruling: PATCH DELETED delegates to the same cascade and is idempotent, rather than rejecting a repeat deletion; this preserves deletion timestamps across both entry points.
- Task 4 complete: `726ff19`; review follow-up `e1bca95` deduplicates persisted precision and last-appended history. Ruling: remove the old 20..350 silent filter because the profile endpoints already validate 10..400; standalone weight recording retains its own existing bounds.
- Final independent review: four actionable concurrency/idempotency/dedup findings reproduced and fixed in one pass. The related PATCH deletion-cascade bypass was also reproduced and fixed. Pre-existing loss of original moderation state on account restore is recorded as audit issue 20 and requires a separate metadata/business decision; it is not claimed fixed here.
- Final suite after review fixes: 425/425 tests, 51/51 files, exit 0. Whitespace check clean. No frontend/AI implementation or schema changes in this phase.
