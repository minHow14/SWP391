// d:\Projects\FPT\SWP391\server\src\config\index.js
import dotenv from 'dotenv';

// Tải biến môi trường từ .env
dotenv.config();

const env = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET;
if (env === 'production') {
  const missing = ['DATABASE_URL', 'JWT_SECRET', 'CLIENT_URL'].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters in production');
}

export const config = Object.freeze({
  env,
  isProduction: env === 'production',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // Cấu hình Database (PostgreSQL / Supabase / Neon)
  db: {
    url: process.env.DATABASE_URL || '',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'vegetarian_db',
  },

  // Cấu hình bảo mật JWT
  jwt: {
    secret: jwtSecret || 'development-only-change-me-before-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Cấu hình kết nối AI Microservice
  ai: {
    url: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
    internalApiKey: process.env.INTERNAL_API_KEY || 'chayxanh_internal_secure_key_2026',
    guestDailyLimit: parseInt(process.env.GUEST_DAILY_LIMIT || '3', 10),
  },
});

export default config;
