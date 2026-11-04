# Frontend repairs — Phase 2 implementation plan

> **For agentic workers:** Use test-driven-development and dispatching-parallel-agents on the disjoint ownership groups below. Root coordinates reviews and commits.

**Goal:** Repair the frontend/AI integration issues documented in the approved audit without inventing runtime data or business content.

**Spec:** `D:/SWP391/SWP391/docs/frontend-audit-2026-11-03.md` and user's confirmation to continue Phase 2.

**Architecture:** Extend existing React-Bootstrap screens and hooks. Reuse the Axios instance for ordinary calls; retain streaming fetch where needed with the same session refresh behavior. Preserve supported diets across FE/BE/AI, and use existing persisted profile/catalog data.

**Tech stack:** Existing React, React Router, React-Bootstrap, Axios, Zod, FastAPI/Pydantic, Prisma, Vitest, RTL, Node test runner and Pytest. SMTP delivery uses Nodemailer; no DevOps changes.

## Constraints

- One branch `fix-frontend`; independent functional fixes get separate conventional commits.
- Root alone stages/commits exact file lists; agents do not mutate Git state.
- Preserve existing untracked documents. Code has first-line full-path comments.
- Use existing styling; accessible labels, loading/error/empty states and disabled pending actions.
- Add meaningful regression coverage and observe failures before implementing nontrivial logic.
- Test backend only on `_test`; no paid model calls or fabricated production data.
- Stop after Phase 2 for confirmation before Phase 3 documentation/integration work, per root AGENTS.md.
- User authorized implementing backend password recovery and legal documents. SMTP requires real provider configuration; legal content is entered and published by administrators, with no invented text.
- User requires restoring exact pre-deletion moderation states. Additive metadata preserves future transitions; legacy content with missing states remains deleted with a warning.

## Ownership and files (full paths)

### A. Session and chat — root

- `D:/SWP391/SWP391/client/src/services/apiClient.js`
- `D:/SWP391/SWP391/client/src/services/authService.js`
- `D:/SWP391/SWP391/client/src/services/aiApi.js`
- `D:/SWP391/SWP391/client/src/utils/session.js`
- `D:/SWP391/SWP391/client/src/components/layout/Header.jsx`
- `D:/SWP391/SWP391/client/src/features/auth/components/AuthForm.jsx`
- `D:/SWP391/SWP391/client/src/features/chat/hooks/useChatBox.js`
- `D:/SWP391/SWP391/client/src/features/chat/hooks/useChatRequest.js`
- `D:/SWP391/SWP391/client/src/features/chat/components/ChatBox.jsx`
- `D:/SWP391/SWP391/client/src/features/chat/components/ChatMessage.jsx` if a real scan result needs rendering.
- Dedicated tests under `D:/SWP391/SWP391/client/test/` and `D:/SWP391/SWP391/client/vitest.config.js` to include regression UI tests.

### B. Admin UI — agent

- `D:/SWP391/SWP391/client/src/pages/admin/AdminPortal.jsx`
- `D:/SWP391/SWP391/client/src/pages/admin/AdminAi.jsx`
- `D:/SWP391/SWP391/client/src/features/admin/components/AdminMembersTab.jsx`
- `D:/SWP391/SWP391/client/src/features/admin/components/AdminPostsTab.jsx`
- `D:/SWP391/SWP391/client/src/features/admin/components/AdminCommentsTab.jsx`
- `D:/SWP391/SWP391/client/src/features/admin/components/AdminReportsTab.jsx`
- `D:/SWP391/SWP391/client/src/features/admin/components/AdminAiMonitorTab.jsx`
- `D:/SWP391/SWP391/client/src/features/admin/components/AdminCategoriesTab.jsx`
- `D:/SWP391/SWP391/client/src/features/admin/components/AdminCategoryFormModal.jsx`
- `D:/SWP391/SWP391/client/src/features/admin/components/AdminCategoryRow.jsx`
- A focused shared pagination hook/component under `D:/SWP391/SWP391/client/src/features/admin/` only if reused by these tables.
- `D:/SWP391/SWP391/client/src/services/adminService.js`
- Regression tests named `D:/SWP391/SWP391/client/test/admin*.test.jsx` or `admin*.test.js`.

### C. Dietary contract and scanner — agent

- `D:/SWP391/SWP391/client/src/utils/aiHelpers.js` (diet mapping only; root does not edit this file concurrently).
- `D:/SWP391/SWP391/client/src/features/mealPlan/components/MealPlanDialog.jsx`
- `D:/SWP391/SWP391/client/src/pages/FoodScanner.jsx`
- `D:/SWP391/SWP391/client/src/features/foodScanner/hooks/useFoodScanner.js`
- `D:/SWP391/SWP391/client/src/features/foodScanner/components/FoodScannerResults.jsx`
- `D:/SWP391/SWP391/client/src/features/foodScanner/components/FoodScannerInputs.jsx` if needed.
- `D:/SWP391/SWP391/client/src/utils/foodScanner.js`
- `D:/SWP391/SWP391/server/src/validators/aiRequestValidator.js`
- Existing request schemas, nutrition/post-validation helpers, chatbot/meal-planner agents and prompts under `D:/SWP391/SWP391/ai_service/`.
- Dedicated `foodScanner*.test.jsx`, diet helper tests, backend dietary-contract tests and Pytest dietary tests.

### D. Community/journal/restaurants — agent

- `D:/SWP391/SWP391/client/src/features/community/hooks/useCommunity.js`
- `D:/SWP391/SWP391/client/src/features/community/hooks/usePostComposer.js` only if needed for the confirmed attachment bug.
- `D:/SWP391/SWP391/client/src/pages/Journal.jsx`
- `D:/SWP391/SWP391/client/src/pages/Restaurants.jsx`
- `D:/SWP391/SWP391/client/src/utils/restaurantDirections.js` or a focused sort helper under the restaurant feature.
- Focused regression tests under `D:/SWP391/SWP391/client/test/`; root handles Vitest include config if new test names require it.

## Tasks and acceptance

- [x] Remove seeded admin credentials from the public UI and production bundle.
- [x] Refresh expired access tokens once for concurrent requests; retry once; preserve newer login/logout sessions; do not clear session for a transient refresh network error.
- [x] Call backend logout and clear local session consistently. Make remember-me actually control session persistence, if retained.
- [x] Wire safe account restore after restoration policy is resolved; expose genuine pagination on all limited admin tables.
- [x] Align log filters and guest-quota UI with gateway actions and signed-cookie guestId.
- [x] Remove nonfunctional category-group selection unless actual persisted business contract is supplied.
- [x] Preserve seven existing diet identities across FE/BE/AI, based on seed descriptions; enforce Buddhist exclusions and Keto bounds from existing requirements; do not claim unsupported checks.
- [x] Pass actual member allergies into scanner, invalidate/abort stale scans on diet/profile/input changes, show unknown text-check status explicitly, display real swapSuggestions.
- [x] Connect chat photo entry point to existing scanner rather than preview-only messages; BMI quick action must use saved measurements.
- [x] Preserve normalized own-post attachments/comments through load/edit/remove.
- [x] Refresh shared profile/session after journal edits; sort restaurant prices numerically with unknown prices last.
- [x] Handle unsupported auth/legal controls according to user response.
- [x] Run client Node tests, UI tests, lint/build, relevant backend/Pytest suites, and inspect rendered desktop/mobile behavior when local runtime is available.
- [x] One final independent review; fix significant findings and commit reports. Ask before Phase 3.

## Review focus

- Login changes/logout during refresh, simultaneous 401s, refresh failure/retry loops, and uploads/streaming retries.
- Scanner result belongs to the scanned diet/member/image even when UI changes during a request.
- Diet identities and validation remain consistent; new prompts do not fabricate model output.
- Pagination/filter changes do not show stale responses or strand an empty last page after deleting a row.
- Restore preserves moderation policy; no stale raw media field names survive into the edit payload.

## Progress / rulings

- Base: `0faf828`; Phase 1 verified with 425 backend tests.
- User already approved the written audit and Phase 2. Continue implementation without an extra design gate.
- All agents share the selected checkout and edit only assigned domains; Git index is root-owned.

- Final Phase 2 verification and per-function commits: [results](D:/SWP391/SWP391/docs/frontend-repairs-phase2.md). Root paused at the phase boundary for user confirmation before Phase 3.
