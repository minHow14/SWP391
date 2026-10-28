// d:\Projects\FPT\SWP391\server\src\config\env.js
import dotenv from 'dotenv';
import { z } from 'zod';

// Tải biến môi trường
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL là bắt buộc'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET là bắt buộc'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_SECRET: z.string().optional(),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  AI_SERVICE_URL: z.string().default('http://127.0.0.1:8000'),
  INTERNAL_API_KEY: z.string().optional(),
  ZIOMAP_API_KEY: z.string().optional(),
  ZIOMAP_API_URL: z.string().default('https://ziomap-api.socibi.com/api/place/text-search'),
  AI_GUEST_COOKIE_SECRET: z.string().optional(),
  GUEST_DAILY_LIMIT: z.coerce.number().int().positive().default(3),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(180_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(15),
  PLACES_RATE_LIMIT: z.coerce.number().int().positive().default(60),
}).refine(
  (data) => {
    if (data.NODE_ENV === 'production' && data.JWT_SECRET.length < 32) {
      return false;
    }
    return true;
  },
  { message: 'JWT_SECRET phải có ít nhất 32 ký tự trên môi trường production', path: ['JWT_SECRET'] }
);

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`❌ Biến môi trường không hợp lệ:\n${issues}`);
  throw new Error(`Cấu hình môi trường không hợp lệ:\n${issues}`);
}

export const env = Object.freeze(parsed.data);
export default env;
