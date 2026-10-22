// D:/SWP391/SWP391/server/src/config/aiConfig.js
import { z } from 'zod';
import './index.js';

const DEFAULT_GUEST_DAILY_LIMIT = 3;
const MAX_DATABASE_INTEGER = 2_147_483_647;

const aiEnvironmentSchema = z.object({
  GUEST_DAILY_LIMIT: z.coerce.number().int().positive().max(MAX_DATABASE_INTEGER)
    .default(DEFAULT_GUEST_DAILY_LIMIT),
});

const environment = aiEnvironmentSchema.parse(process.env);

export const aiConfig = Object.freeze({
  guestDailyLimit: environment.GUEST_DAILY_LIMIT,
});
