// server/src/config/videoRecipeSummaryConfig.js
import { z } from 'zod';
import './index.js';

const milliseconds = z.coerce.number().int().positive().max(2_147_483_647);
export const videoRecipeEnvironmentSchema = z.object({
  YT_DLP_PATH: z.string().trim().min(1).default('yt-dlp'),
  VIDEO_METADATA_TIMEOUT_MS: milliseconds.default(30_000),
  VIDEO_AI_TIMEOUT_MS: milliseconds.default(600_000),
  VIDEO_JOB_LEASE_MS: milliseconds.min(30_000).default(90_000),
  VIDEO_JOB_POLL_MS: milliseconds.min(250).default(2_000),
  VIDEO_JOB_RETRY_MS: milliseconds.min(1_000).default(30_000),
  VIDEO_JOB_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
});

const environment = videoRecipeEnvironmentSchema.parse(process.env);
export const videoRecipeSummaryConfig = Object.freeze({
  ytDlpPath: environment.YT_DLP_PATH, metadataTimeoutMs: environment.VIDEO_METADATA_TIMEOUT_MS,
  aiTimeoutMs: environment.VIDEO_AI_TIMEOUT_MS, leaseMs: environment.VIDEO_JOB_LEASE_MS,
  pollMs: environment.VIDEO_JOB_POLL_MS, retryMs: environment.VIDEO_JOB_RETRY_MS,
  maxAttempts: environment.VIDEO_JOB_MAX_ATTEMPTS,
});
