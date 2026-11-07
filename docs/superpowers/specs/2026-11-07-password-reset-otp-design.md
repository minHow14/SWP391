# Password reset OTP and email design

The user requested replacing recovery links with email OTP, updating the frontend, and redesigning the plain email shown in their screenshot. Their instruction to implement is treated as opting out of further design questions. Work remains subject to the root AGENTS.md phase checkpoints.

## Behavior

- Request recovery using the registered email; return the same response for existing and unknown accounts.
- Email a cryptographically random six-digit OTP, valid for five minutes. Allow five failed attempts and a sixty-second resend cooldown. A replacement code invalidates the previous code and any prior reset permission.
- Verify email and OTP, then return a random single-use reset token valid for five minutes. Reuse the existing final password-reset endpoint and password/session invalidation transaction.
- Store a keyed OTP digest, never plaintext. Serialize issuance and verification on the user row. Persist wrong attempts even when verification fails. Verification must not expose whether an account exists.
- Use a dedicated password_reset_otps table mapped by Prisma; keep the existing password_reset_tokens table for short-lived reset permission.
- Send branded Vietnamese HTML with a plain-text alternative, a ChayXanh sender name, legible OTP, expiry, and a reminder never to share the code. No external image dependency or fabricated contact details.
- Frontend, in phase 2: email / OTP / password / success steps, paste-friendly OTP input, resend timer, change email, validation, submit/loading/error states, accessible focus, and the existing React-Bootstrap design language. The user's phase 2 clarification requires keeping the email input visible, with Gửi OTP directly underneath, and revealing the OTP input below it in the same card only after successful submission. Replace the plain login link with a styled secondary navigation button.
- Final UI refinement: after sending, remove the large resend button under the email. Show Gửi lại mã OTP as a small button styled as text beneath the OTP input, in place of the removed six-digit helper sentence. Preserve the server resend cooldown and disabled/loading behavior.

## Approach

Chosen implementation: exchange the verified OTP for the existing high-entropy reset token. This retains the existing atomic password and session revocation behavior. Submitting OTP and password together would remove one endpoint but would not provide the requested separate verification step. Sending both a link and OTP would retain unnecessary alternate recovery paths.

The five-minute TTL, five attempts, sixty-second cooldown, and HTML visual treatment are the implementer's proposed defaults carried from the prior reply. The user then instructed implementation and expanded scope to FE and email styling.

## Phases and constraints

1. Backend, additive migration, email template and directly related security tests. Stop for phase confirmation.
2. Frontend and its focused tests, including browser inspection on desktop and mobile. AI service needs no change. Stop for phase confirmation.
3. Broader regression and documentation: OpenAPI, ERD, env examples, and README if needed.

No mock data in production, no new dependencies, no DevOps. Keep credentials out of logs, commits, and previews. Apply migrations without resetting any database; tests only use the dedicated database ending in _test.
