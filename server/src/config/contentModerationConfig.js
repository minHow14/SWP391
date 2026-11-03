// D:/SWP391/SWP391/server/src/config/contentModerationConfig.js
import { z } from 'zod';
import './index.js';
import { MODERATION_LEASE_GRACE_MS, MODERATION_POLL_MS, MODERATION_RETRY_MS } from '../constants/contentModeration.js';

export const contentModerationEnvironmentSchema = z.object({
  CONTENT_MODERATION_ENABLED: z.enum(['true', 'false']).default('false'),
  CONTENT_MODERATION_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  CONTENT_MODERATION_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
});
const environment = contentModerationEnvironmentSchema.parse(process.env);
export const contentModerationConfig = Object.freeze({
  enabled: environment.CONTENT_MODERATION_ENABLED === 'true',
  timeoutMs: environment.CONTENT_MODERATION_TIMEOUT_MS,
  leaseMs: environment.CONTENT_MODERATION_TIMEOUT_MS + MODERATION_LEASE_GRACE_MS,
  maxAttempts: environment.CONTENT_MODERATION_MAX_ATTEMPTS,
  pollMs: MODERATION_POLL_MS,
  retryMs: MODERATION_RETRY_MS,
});
