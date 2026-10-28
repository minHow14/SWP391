// D:/SWP391/SWP391/server/src/constants/contentModeration.js
export const MODERATION_PENDING_STATUS = 'PENDING_MODERATION';
export const MODERATION_AI_PATH = '/api/v1/content-moderations';
export const MODERATION_MAX_RESPONSE_BYTES = 32_768;
export const MODERATION_LEASE_GRACE_MS = 30_000;
export const MODERATION_POLL_MS = 2_000;
export const MODERATION_RETRY_MS = 30_000;
export const MODERATION_RELEASED_LEASE = Object.freeze({ leaseToken: null, leaseExpiresAt: null });
