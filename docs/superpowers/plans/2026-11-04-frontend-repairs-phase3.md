# Frontend repairs Phase 3 Implementation Plan

> **For agentic workers:** Use executing-plans inline. One independent review at the end. Root alone stages and commits exact file lists.

**Goal:** Verify the repaired FE/BE/AI contracts and document actual local setup, migrations, password recovery, legal publishing and remaining map warnings.

**Architecture:** Run the existing frontend Axios/auth service against the actual Express app over loopback and the isolated PostgreSQL test database. Replace only SMTP transport in tests. Document existing behavior without adding runtime features or changing map behavior.

**Tech Stack:** Existing Axios, Express, Prisma, Vitest/Supertest, Node test runner, Pytest, OpenAPI 3.1 and Markdown.

**Spec:** User approved Phase 3 on 04/11/2026 and asks for the two map warnings after completion. Previous results: `D:/SWP391/SWP391/docs/frontend-repairs-phase2.md`.

## Global Constraints

- Continue the selected branch `fix-frontend`; separate conventional commits for independent deliverables. No merge/push.
- No runtime mock data, DevOps, paid inference, development DB writes, actual credential changes or outbound email.
- Backend tests load `.env.test` and refuse databases whose names do not end in `_test`; clean up only owned fixtures.
- Existing unrelated untracked documents remain untouched. Changed code starts with an absolute-path comment; OpenAPI JSON remains valid JSON.
- README keeps all 14 required sections and uses actual locked/configured versions and local commands.
- No business/legal text or contact details invented; administrators supply approved content. Real SMTP delivery remains a configuration-dependent check.

## Review Focus

- Client recovery service uses actual API envelope/routes; fragment token parses and can be consumed exactly once.
- Password reset revokes old access/refresh tokens; token refresh preserves the same owner and refuses another tab's identity before a write.
- OpenAPI documents actual responses, validation limits, RBAC and legacy aliases rather than an idealized schema.
- Test transport/cookie plumbing stays inside tests; no external calls or application workers start.
- Explain RestaurantMap effect warnings precisely; distinguish a lint dependency warning from a proven runtime failure.

## Task 1: Cross-service authentication integration

**Files:** Create `D:/SWP391/SWP391/server/tests/frontendAuthIntegration.test.js`.

**Consumes:** client `authService`, `apiClient`, `setSession/getSession`, `getPasswordResetToken`; server `app`, Prisma and signed JWT helpers.
**Produces:** Reproducible real HTTP/DB coverage included in `server npm test`.

- [x] Exercise forgot → SMTP test capture → fragment parse → reset → reject reuse → old credentials/session revoked → new login.
- [x] Exercise an expired access token plus matching refresh cookie: original profile write succeeds and token stays with the same user.
- [x] Exercise a refresh cookie from another account: client rejects and neither account is modified.
- [x] Run the focused suite; any actual production defect must get a failing regression before a minimal fix and separate commit.
- [x] Commit only the new integration test after it passes.

## Task 2: API and schema documentation

**Files:** Create `D:/SWP391/SWP391/docs/frontend-repairs-openapi.json`; update `D:/SWP391/SWP391/docs/ERD.md` and, where stale, `D:/SWP391/SWP391/docs/ai-openapi.json`.

**Consumes:** Current request validators, routes, services and Prisma mappings.
**Produces:** Actual recovery/refresh/legal/restore API contracts and additive schema documentation; canonical seven-diet contract in AI docs.

- [x] Document password limits/fragment transport, no-store, generic response vs SMTP 503, JWT revocation and refresh `userId`.
- [x] Document public/admin legal endpoints, allowed slugs, draft visibility and saved fields; exact restoration counts/warnings and legacy missing metadata.
- [x] Update ERD for PasswordResetToken, LegalDocument, tokenVersion and original moderation states without modifying migrations.
- [x] Parse JSON, resolve internal references, inspect schemas against code and run appropriate contract suites.
- [x] Commit the documentation independently.

## Task 3: Local setup and test instructions

**Files:** Update `D:/SWP391/SWP391/README.md`, `D:/SWP391/SWP391/server/.env.test.example`, `D:/SWP391/SWP391/client/.env.example` and `D:/SWP391/SWP391/server/.env.example` only where needed.

**Consumes:** Actual package scripts, lockfiles, Vite proxy and service environment validators.
**Produces:** All 14 README sections remain; accurate SMTP, legal, migrations, test DB and warning guidance.

- [x] Add SMTP variables/TLS settings and legal publishing steps; no actual secrets or placeholder legal content.
- [x] Explain normal DB migrate vs destructive test preparation; commands start from explicit directories and do not overwrite configured env files.
- [x] Correct stale client environment claims and runtime requirements from installed package engines.
- [x] Explain test scope and real-provider limits; preserve existing valid operational guidance.
- [x] Verify Markdown links, sample-variable coverage and scripts against repository files. Commit separately.

## Task 4: Final verification and report

**Files:** Create `D:/SWP391/SWP391/docs/frontend-repairs-phase3.md`; update this plan's checkboxes with measured results.

- [x] Run all server, client Node/UI and AI tests; client lint/build; validate schema and migration state read-only.
- [x] Fresh independent review of Phase 3 changes; fix consequential findings with focused verification.
- [x] Capture precise map warning lines, dependency lists and implications, leaving map behavior unchanged as requested.
- [x] Record counts, commit references, remaining configuration-dependent checks and lack of push/merge.
- [x] Commit report; verify tracked working tree clean and preserve unrelated untracked files.

## Decisions and progress

- Base: `ee40176`. User approved execution; no extra design gate. Existing checkout is intentionally reused per single-branch instruction.
- Pre-flight: Task 1 consumes the implemented Phase 2 APIs; Tasks 2/3 describe those contracts. No runtime interface changes planned.
- Ruling: SMTP and provider calls are replaced only in automated tests; actual email delivery cannot be claimed without user-configured provider credentials. Do not request or print secrets.
- Ruling: The map warnings will be explained, not silently altered; no runtime map failure has been established from lint alone.

- Task 1 complete: b96b5f0; focused HTTP suite 3/3. Initial fixture-order assumption corrected by asserting ownership by user_id, no production change.
- Task 2 complete: 54c3cc8, 5d70ff3; JSON/references and FastAPI OpenAPI model validation pass. Review corrected credential-source precedence.
- Task 3 complete: README has 14 sections, links and sample-variable coverage verified; explicit SMTP/test safety and actual lockfile engines documented.
- Task 4 complete: server486, client129Node+169UI, AI284; workspace and real FastAPI HTTP scripts pass; lint0errors/2mapwarnings, build passes. Full results in D:/SWP391/SWP391/docs/frontend-repairs-phase3.md.
- Final review: independent reviewer checked Phase3 range plus README/env diffs. One P2 documentation mismatch fixed; no new runtime bug established. Existing worker-startup comment corrected within the requested local-setup documentation scope.
- Ruling: no new skill scratch workspace is needed for code generation; this phase adds one integration test and documentation only, using existing ignored node_modules/.cache/frontend-repairs for outputs. Reuse of the selected checkout is mandated by the user's one-branch instruction.