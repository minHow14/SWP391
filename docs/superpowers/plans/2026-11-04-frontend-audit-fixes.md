# Frontend Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the four frontend findings selected by the user: profile save after token refresh, ingredient-shop classification, weight timestamp contract, and consistent BMI labels.

**Architecture:** Reuse session identity revisions, the current weight API's `recordedDate` field, and the existing shared BMI helper. Persist the independent ingredient-shop flag as `isIngredientShop` / `is_ingredient_shop` instead of representing a shop with a diet ID. Keep the old restaurant request compatible by defaulting the flag to false.

**Tech Stack:** Existing React/Vite, Axios, Express, Zod, Prisma/PostgreSQL, Vitest/RTL/Supertest. No new dependencies.

**Spec:** User's four selected findings and `D:/SWP391/SWP391/docs/audits/2026-11-04-full-project-audit.md` (A10/A11/A16/A19).

## Global Constraints

- Work in `D:/SWP391/SWP391` on the current non-main branch; no worktree, commit, push or merge is needed for this fix.
- Preserve unrelated work and uploaded/catalog data. No mock data in application code, no DevOps changes.
- Use additive Prisma Migrate migration, generate with `prisma migrate dev --name add_ingredient_shop_classification --create-only`; never reset an existing database or use db push.
- Run integration writes only on `.env.test` with a database name ending `_test`; migration generation/application initially targets that database too.
- Follow AGENTS.md phase gates: finish DB/BE first, ask before frontend changes, then ask before final documentation/regression phase. Necessary regression tests accompany each fix.
- Every changed/new code file starts with its absolute path comment.
- Existing wrongly saved shops cannot be identified from diet ID alone; do not guess a backfill.

## Design and approaches

Removing the shop option would hide the selected feature. Reusing diet ID 1 repeats the original bug. A new general location taxonomy is unnecessary for the two independent kinds currently supported. The smallest complete approach is an `isIngredientShop` boolean, default false for existing rows; new shop proposals must set it true and use `diet_type_id: null`. Existing non-shop proposals must still supply a valid diet ID.

Catalog preserves `type: shop` for flagged rows; non-shop `type` retains the existing vegan/buddhist/separate mapping. Nearby/search responses expose the same flag. Do not change geographic search/filter behavior as part of this fix.

The profile fix will accept same-user token refresh but reject logout/relogin/account-switch responses using `identityRevision` plus user ID, preserving the refreshed token. BMI labels will reuse the project's existing helper rather than introducing a different medical rule. Weight requests will send `recordedDate`; retain existing caller aliases only at the FE service boundary if needed.

## Review Focus

- Legacy restaurant proposals without the new flag still work.
- Shop classification survives API write, database read, catalog reload, and nearby mapping without inventing a diet ID.
- Invalid boolean/diet combinations fail before any database write; anonymous callers remain unauthorized.
- Profile responses from an older login cannot change a newer session, even when the user logs back into the same account.
- Weight timestamps and BMI boundary values must be checked against existing BE/AI conventions, not just mocked FE requests.

## Phase 1 — DB and backend classification

**Files:**
- Modify `D:/SWP391/SWP391/server/prisma/schema.prisma`.
- Create generated `D:/SWP391/SWP391/server/prisma/migrations/<generated>_add_ingredient_shop_classification/migration.sql`.
- Modify `D:/SWP391/SWP391/server/src/validators/workspace.validator.js`.
- Modify `D:/SWP391/SWP391/server/src/services/workspace.service.js`.
- Modify `D:/SWP391/SWP391/server/src/services/places.service.js`.
- Create `D:/SWP391/SWP391/server/tests/restaurantClassification.test.js`.

**Interfaces:** `Restaurant.isIngredientShop Boolean @default(false) @map("is_ingredient_shop")`; request field `isIngredientShop` optional/default false; `diet_type_id` nullable only for a shop, required for a non-shop. Persist through existing `placeRepository.create(data, tx)`. Catalog returns `type: shop` for true flag. Nearby returns `isIngredientShop`.

- [x] Write API/DB regression tests for shops, legacy restaurant types, invalid inputs and anonymous requests; run and observe expected failures.
- [x] Add the boolean field and generate additive migration on the isolated test database. Inspect SQL; stop on any reset prompt.
- [x] Apply the migration to `_test` and generate Prisma Client.
- [x] Implement validator/persistence/catalog/nearby mapping; keep existing restaurant caller compatibility.
- [x] Run focused tests, all backend tests, schema validation and existing workspace integration; review the diff independently.
- [x] Record results and pause for the user's Phase 2 confirmation.

## Phase 2 — Frontend fixes after confirmation

**Files:** `D:/SWP391/SWP391/client/src/features/profile/hooks/useProfileForm.js`, `D:/SWP391/SWP391/client/src/features/restaurants/components/RestaurantProposalForm.jsx`, `D:/SWP391/SWP391/client/src/services/authService.js`, `D:/SWP391/SWP391/client/src/features/profile/components/WeightTracker.jsx`, and focused tests under `D:/SWP391/SWP391/client/test/`.

- [x] Profile: write a failing refresh-while-saving test and stale-identity protection tests; use getSessionSnapshot identity revision and current session token.
- [x] Proposal: test shop submission through the actual backend validator; send `isIngredientShop` and null diet for shop.
- [x] Weight: test optional timestamp crossing FE service and BE validator; emit canonical `recordedDate`.
- [x] BMI: test boundary values and reuse `bmiCategory` in WeightTracker.
- [x] Run client node/UI tests, lint/build, and focused integration checks; pause for Phase 3 confirmation.

## Phase 3 — Documentation and final regression after confirmation

- [x] Update relevant API documentation and audit status; preserve unimplemented audit findings.
- [x] Re-run affected suites and inspect rendered profile/proposal flows when available; report exactly which checks ran.
- [x] Record migration status and distinguish generated/test-applied migration from any remaining local application step.

## Progress

- Initial state: commit `0de7db1`, branch `youtube-captions`, no tracked modifications; pre-existing untracked documents preserved.
- Previous audit baseline: backend 492 tests, frontend node 129, frontend UI 175, AI 306 passed. Fresh verification will accompany this change.

### Phase 1 results

- Regression before implementation: 5 expected failures / 4 passes (shop request rejected and persisted flag missing). After implementation: all 9 new regression tests passed.
- Full backend suite: 501/501 tests passed across 59 files. Existing `npm run test:database` integration passed.
- Prisma validate, Prisma Client generation, JavaScript syntax checks for all four changed/new JS files, and `git diff --check` passed. Prisma's existing package.json configuration deprecation warning remains.
- Generated migration: `D:/SWP391/SWP391/server/prisma/migrations/20261104121231_add_ingredient_shop_classification/migration.sql`. SQL only adds `restaurants.is_ingredient_shop BOOLEAN NOT NULL DEFAULT false`.
- Migration applied to `vegetarian_db_test`, then the reviewed local development database `vegetarian_db`. No reset/seed. Development restaurant count stayed 38; checksum of all existing restaurant fields was unchanged across migration.
- Reused `placeRepository.create` rather than adding another Prisma write in the service. Shop proposals use a null diet, and catalog/nearby expose persisted identity; old requests still work with default false.
- Fresh independent read-only review found no actionable Critical/Important/Minor issues in Phase 1.
- Review rulings: frontend serialization/session/weight/BMI changes await the explicit phase gate; no guessed backfill for historically misclassified shops; geographic filtering/provider classification is outside these four selected fixes. Broader audit findings remain open.
- Status at the Phase 1 gate: Phase 1 complete; Phase 2 not started. No client or AI source files changed at that point; no commits or pushes made.

### Phase 2 results

- User authorized Phase 2 with “làm phase 2 đi”. Implementation stayed in the existing checkout and preserved all Phase 1/unrelated work.
- Changed four application files: `client/src/features/profile/hooks/useProfileForm.js`, `client/src/features/profile/components/WeightTracker.jsx`, `client/src/features/restaurants/components/RestaurantProposalForm.jsx`, and `client/src/services/authService.js`.
- Added `client/test/profileForm.test.jsx`, `client/test/restaurantProposal.test.jsx`, `client/test/weightTracker.test.jsx`; updated `client/test/authService.test.js`. All eight changed/new code files have the required absolute path header.
- RED evidence: 15 expected failures among 25 new UI tests; 4 expected failures among 10 auth-service tests. Failures reproduced dropped refresh results, old-login result/error leakage, missing shop flag/diet handling, inconsistent BMI labels and lost timestamp fields.
- GREEN evidence: all 25 focused UI tests and all 10 auth-service tests passed. Strengthened profile assertions additionally verify one pending PATCH and the serialized health/allergy payload.
- Final full frontend verification: `npm test` 133/133 passed; `npm run test:ui` 200/200 passed across 39 files. The full UI suite was rerun after the final assertion changes.
- `npm run lint`: zero errors, two pre-existing effect-dependency warnings in RestaurantMap.jsx lines 108/171. `npm run build` passed with the existing >500 kB main-chunk warning. Diff whitespace check passed.
- Actual FE Axios services were bridged to the real local Express app using Supertest and the isolated PostgreSQL `_test` database: an expired access token triggered a valid cookie refresh and retried profile persistence; `recordedAt` caller input reached `health_histories.recorded_date` with the exact UTC timestamp via canonical `recordedDate`; a shop persisted true/null and reloaded from catalog as `shop`. The fixtures were cleaned up; no inference/provider calls or development-data writes were made in this check.
- Fresh read-only review found no actionable Critical/Important/Minor issues. Reviewer independently ran 10 auth-service tests and 25 UI tests; an initial sandbox temp-file error was bypassed by rerunning the BMI suite.
- Scope rulings: this fixes FE timestamp serialization, not the pre-existing BE acceptance of invalid timestamps or past-weight chronology; historical shop backfill/provider/geographic behavior remains excluded; existing profile loader/background GET ordering and broader session storage were not changed. These remain separate audit work, not claimed fixed here.
- Current status: Phase 2 complete and all four selected FE behaviors fixed; Phase 3 documentation/final regression/rendered application checks await user confirmation under AGENTS.md section 6. No commits or pushes made.

### Phase 3 results — 05/11/2026

- User authorized commits and Phase 3. Four separate fixes committed with author and committer `nguyenphu2108 <nguyenphu210803@gmail.com>`: e3588e4 profile refresh, a918baf ingredient shops, 48b60fb weight timestamp, 8db9c97 BMI labels. No push requested or performed.
- Full regression: backend 501/501, frontend UI 200/200, frontend logic 133/133, AI 306/306. Build succeeded. Lint zero errors/two existing RestaurantMap dependency warnings; existing bundle-size and slowapi deprecation warnings remain.
- OpenAPI updated for profile GET/PATCH, weight timestamp, shop proposal and catalog classification; JSON/reference checks and FastAPI OpenAPI model validation passed. No environment variable changed; no .env.example changes needed.
- Real browser check used isolated Express :5501, Vite :5174, `_test` database and five-second access tokens. User requested normal names/email and age about 25 for visible fixtures; only test data used. Observed PATCH 401 → refresh 200 → PATCH 200, success notice and persisted health/allergy values after reload. Shop created through the UI survived catalog reload and appeared under the shop filter. BMI 24 and 26 displayed shared labels. Saved screenshots under ignored node_modules/.cache/project-audit/; DB readback confirmed values.
- Browser fixture user/shop removed and isolated processes stopped; development data not changed by browser checks. Migration was already applied to development and `_test` in Phase 1; no pending application step for this migration.
- A16 backend invalid-date validation and A15 historical current-weight behavior remain open; no guessed historical-shop backfill. README unchanged because local install/runtime instructions are unchanged; API details are in docs/frontend-repairs-openapi.json.
- Four selected FE fixes and Phase 3 are complete. User expanded the next test pass to all clickable website features; that broader functional audit is tracked separately and is not claimed complete by this phase.
