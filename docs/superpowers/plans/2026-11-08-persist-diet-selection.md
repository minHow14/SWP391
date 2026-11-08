# Persist account diet selection

**Goal:** Save the authenticated user's confirmed diet through the existing profile API and read the saved diet before submitting a weekly meal-plan request.

**Approach:** Reuse `PATCH /auth/me` with `health_profile.diet_type_id`; no schema or AI-service changes. Guests retain their tab choice. Account profiles are authoritative after login and never inherit another account's browser choice automatically. Keep the picker open on save failure. Fetch `/auth/me` before generation and reject missing/unavailable profile diets instead of silently substituting Vegan. Keep other explicit meal-plan inputs intact.

**Scope:** Client behavior and regression tests only. No dependencies, migrations, deployment changes, or edits to existing account data for verification.

## Tasks

- [x] Add regression tests for saving/reloading a diet, guest isolation, failed/pending saves, login/account changes, and weekly requests using the current saved diet.
- [x] Run the tests against the original code and confirm the intended failures.
- [x] Add a focused diet-selection hook, make the picker await confirmation, and load account profiles after login.
- [x] Add a meal-plan service that reads the current account diet immediately before generation, with cancellation and identity checks.
- [x] Connect the layout and meal-plan dialog; label the account diet as coming from the profile.
- [x] Run focused tests, the client logic/UI suites, build, and lint changed files; review the diff.

## Verification notes

- Baseline `npm test`: 134 passed.
- Baseline UI suite: 220 passed, 4 failed in `adminPagination.test.jsx` and `communityOwnPosts.test.jsx` before changes.
- Review failures around delayed responses, account switching, token refresh, missing diet IDs, and blocked browser storage.
- Final focused suites: 34 passed, including 25 new regression cases.
- Final logic suite: 134 passed. Final full UI suite: 245 passed, the same 4 baseline failures remain.
- Unchanged failures: `adminPagination.test.jsx` lacks its database context; the three own-post state cases (`PENDING_MODERATION`, `HIDDEN_BY_AI`, `DRAFT`) in `communityOwnPosts.test.jsx` expect an obsolete editor title.
- Changed-file ESLint and Vite build passed; build retains its existing large-chunk warning.
- Real API verification used the isolated `_test` database: created a temporary account, patched two existing diet IDs, asserted both database values and GET responses, then removed that account. Development accounts were untouched; no live model inference was needed.
- Independent review identified cold-storage object identity and stale meal-plan profile-read races; both received failing regression tests and were fixed. Re-review found no further actionable issues.
