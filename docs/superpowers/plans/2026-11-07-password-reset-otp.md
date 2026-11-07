# Password reset OTP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace recovery emails containing raw links with secure OTP recovery and a branded HTML email, followed by a matching frontend.

**Architecture:** A dedicated per-user OTP record is protected by database row locks. Successful verification consumes the OTP and issues an existing PasswordResetToken. Existing reset completion continues to revoke sessions atomically.

**Tech Stack:** Existing Node/Express, Prisma/PostgreSQL, Nodemailer, React/React-Bootstrap, Vitest/Supertest.

**Spec:** `docs/superpowers/specs/2026-11-07-password-reset-otp-design.md`

## Global Constraints

- Six digits; five-minute OTP and reset permission; five wrong attempts; sixty-second resend cooldown.
- No production mock data, no new dependencies, no DevOps; API fields camelCase and mapped database fields snake_case.
- Keep OTP/password/token out of logs and public responses, except reset permission returned only after verification.
- Tests must use the dedicated `_test` database. Never reset databases to apply this feature.
- Stop after each phase for confirmation, per root AGENTS.md.

## Review Focus

- Failed guesses must persist outside the error-throwing transaction boundary.
- Concurrent OTP verifications must not issue multiple usable reset permissions.
- Resending must revoke both old OTP and already verified reset permission.
- Unknown, deleted, and locked accounts must not reveal account existence.
- Mail failures and stale concurrent sends must not revoke a newer challenge.

### Task 1: Backend OTP and branded email (phase 1)

**Files:** `server/prisma/schema.prisma`, new migration, `server/src/constants/passwordReset.js`, `server/src/repositories/passwordResetOtpRepository.js`, `server/src/services/passwordResetOtpService.js`, `server/src/services/passwordResetService.js`, `server/src/services/mailService.js`, `server/src/templates/passwordResetEmail.js`, password reset validators/controller/routes and associated tests.

**Interfaces:**
- `POST /api/v1/auth/forgot-password { email }` returns generic success with `data.expiresInSeconds: 300` and `data.resendAfterSeconds: 60`.
- `POST /api/v1/auth/verify-password-reset-otp { email, otp }` returns `data.token` and `data.expiresInSeconds: 300`; invalid challenges use `PASSWORD_RESET_OTP_INVALID`.
- Existing `POST /api/v1/auth/reset-password { token, newPassword }` retains its contract.
- `mailService.sendPasswordReset({ delivery, to, otp })` sends both HTML and text.

- [x] Write integration tests for request, validation, five failures, expiry, resend, concurrent request/verification, revocation, and rollback. Update affected legacy tests to the OTP contract.
- [x] Run focused tests and observe the missing OTP behavior fail.
- [x] Add the mapped OTP model; generate additive migration using `prisma migrate dev --create-only --name add_password_reset_otps`, with no reset. Apply on local development and dedicated test databases, generate client.
- [x] Implement OTP issuance and verification using user row locks, keyed digests and timing-safe comparisons. Commit invalid-attempt increments before raising the generic error.
- [x] Implement Vietnamese HTML and text mail, named sender, timeout/TLS preserved. Retain legacy final reset transaction.
- [x] Run `npm test -- tests/passwordResetMail.test.js tests/passwordResetService.test.js tests/passwordResetApi.test.js tests/passwordResetOtpApi.test.js tests/frontendAuthIntegration.test.js`; all must pass.
- [x] Review phase 1 changes and run the broader backend suite, reporting preexisting failures explicitly. Render and inspect the email preview.
- [x] Stop for confirmation before phase 2. No commit or push without a user request.

### Task 2: Frontend recovery flow (phase 2, authorized by user's screenshot clarification)

**Files:** `client/src/services/authService.js`, `client/src/features/auth/utils/authValidation.js`, `client/src/features/auth/components/PasswordRecoveryForm.jsx`, `RecoveryEmailStep.jsx`, `RecoveryOtpStep.jsx`, `RecoveryPasswordStep.jsx`, `client/src/features/auth/hooks/usePasswordRecovery.js`, `client/src/features/auth/passwordRecovery.css`, `client/test/authRecovery.test.jsx`, `client/test/authRecoveryService.test.js`, `client/test/authRecoveryValidation.test.js`, and `server/tests/frontendAuthIntegration.test.js` to exercise the new client wrapper over HTTP.

**Interfaces:** Consume task 1's request and verify endpoints; keep reset token in memory, never persist OTP or grant in localStorage or URL.

- [x] Write failing tests for the email → OTP → password → success flow, resend cooldown, changing email, malformed/pasted OTP, server errors and expired reset permission.
- [x] Implement with existing React-Bootstrap, React Hook Form, Zod and API client. Keep the form responsive with label/error relationships and focus on step transitions.
- [x] Run recovery tests, lint and build; inspect desktop and mobile in browser, fix observed issues.
- [x] Stop for phase 3 confirmation.

### Task 3: Documentation and regression (phase 3)

- [ ] Update OpenAPI, ERD, env descriptions and the relevant README sections without exposing SMTP credentials.
- [ ] Run relevant backend/client suites; document exact commands and remaining limitations.
- [ ] Review the complete change and report observed behavior and verification.

## Progress

- Baseline: 37/37 password recovery tests passed with sandbox network restrictions lifted. Current branch: `feature/password-reset-otp`; no worktree created because configuration and running local environment live in this checkout.
- Execution: direct implementation is authorized by the user's request to make the changes. Phase checkpoints remain mandatory. No automatic commits.
- Phase 1: complete. RED: request-response contract test expected OTP metadata but received the prior empty data object. GREEN: focused recovery suite 56/56; full backend suite 562/562 in 62 files (`npm test`, 95.53 seconds). Full output: `docs/superpowers/password-reset-otp-backend-suite.log`.
- Database: additive migration `20261107112157_add_password_reset_otps` generated by Prisma and applied to local development and `_test` databases. Pending preexisting moderation-status migration was also applied by Prisma; no reset or destructive SQL was used.
- Windows runtime: stopped only the API child belonging to the existing project nodemon watcher to release the Prisma DLL, generated Prisma Client, and triggered the same watcher to restart. Final `/health`: HTTP 200. Final Gmail SMTP TLS/authentication verification: passed; no live email sent.
- Email visual verification: browser inspection at 1000px and 375px widths, no horizontal overflow. Desktop evidence: `docs/superpowers/2026-11-07-password-reset-email-desktop.jpg`. Preview HTML contains an independently generated non-active code, not a live user challenge. Preview server was stopped after inspection.
- Independent read-only reviewer: no substantive findings. Coverage limitation: delayed failure of an older email after replacement and simultaneous resend/verification are protected by ID-scoped cleanup/user locks but do not yet have direct interleaving tests.
- Phase 2 was authorized when the user clarified the screenshot: email, Gửi OTP, then an additional OTP field in the same frame, with a redesigned login navigation button.
- Phase 2 RED: the new UI test failed because the Gửi OTP button was missing. Focused GREEN: 14/14 tests. Node suite: 134/134. Targeted ESLint: clean. Production build: successful, with the existing large-chunk advisory.
- Full UI suite: 220 passed / 4 failed in 2 unchanged test files. `client/test/adminPagination.test.jsx` renders AdminPostsTab without its required database context (getPosts case). `client/test/communityOwnPosts.test.jsx` expects the old Chỉnh sửa nội dung text for PENDING_MODERATION, HIDDEN_BY_AI and DRAFT, while the unchanged composer now uses Chỉnh sửa bài viết Blog. These are unrelated to the OTP work. Full results: `docs/superpowers/password-reset-otp-client-ui-suite.json`.
- Full ESLint has an unrelated existing purity error in `client/src/features/community/hooks/usePostComposer.js:56` and two existing dependency warnings in `client/src/features/restaurants/components/RestaurantMap.jsx`. All changed frontend/test files pass targeted lint.
- Browser checks: 1280px desktop and 375px mobile, no horizontal overflow; blank email displays inline validation; redesigned login navigation reaches `/dang-nhap`. Screenshots: `docs/superpowers/2026-11-07-password-recovery-desktop.jpg` and `docs/superpowers/2026-11-07-password-recovery-mobile.jpg`. No live email was sent; OTP expansion, verification and completion were checked in automated UI/API tests.
- Independent frontend reviewer: no substantive findings. Remaining phase 3 documentation awaits the root AGENTS.md checkpoint.
- Final phase 2 verification: recovery UI 14/14, client service/validation and other Node tests 134/134, client-over-HTTP integration 3/3, production build passed. Existing global lint/UI failures listed above remain outside this change. No live email sent.
- User's final UI refinement implemented: remove the large resend button above OTP and the old six-digit helper text; place a small Gửi lại mã OTP text button directly beneath the OTP input. Existing 14 recovery UI tests and changed-file lint passed after the refinement.
- Read-only database inspection confirmed the screenshot account has a bcrypt password hash, a consumed reset permission, and a security token version advanced from 0 to 1. The password update and reset permission consumption share the existing atomic transaction. No plaintext password or hash was printed.
- User explicitly requested committing and pushing the completed feature branch. Push only the scoped implementation, tests, additive migration, and these feature design/plan documents; leave unrelated audit files, logs, previews, screenshots, and credentials uncommitted. Phase 3 formal OpenAPI/ERD/env documentation remains pending.
