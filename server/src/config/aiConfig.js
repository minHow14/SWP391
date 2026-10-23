// d:\Projects\FPT\SWP391\server\src/config/aiConfig.js
import { z } from 'zod';
import './index.js';
import { internalApiKeySchema } from '../validators/internalApiKeyValidator.js';

const DEFAULT_GUEST_DAILY_LIMIT = 3;
const MAX_DATABASE_INTEGER = 2_147_483_647;

const aiEnvironmentSchema = z.object({
  GUEST_DAILY_LIMIT: z.coerce.number().int().positive().max(MAX_DATABASE_INTEGER)
    .default(DEFAULT_GUEST_DAILY_LIMIT),
  AI_SERVICE_URL: z.url().default('http://127.0.0.1:8000'),
  INTERNAL_API_KEY: internalApiKeySchema.optional(),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1).max(MAX_DATABASE_INTEGER).default(180_000),
});

const environment = aiEnvironmentSchema.parse(process.env);

export const aiConfig = Object.freeze({
  guestDailyLimit: environment.GUEST_DAILY_LIMIT,
  url: environment.AI_SERVICE_URL.replace(/\/$/, ''),
  internalApiKey: environment.INTERNAL_API_KEY,
  timeoutMs: environment.AI_TIMEOUT_MS,
});
