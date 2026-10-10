import dotenv from 'dotenv';

// Tải biến môi trường từ .env
dotenv.config();

export const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
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
    secret: process.env.JWT_SECRET || 'swp391_default_fallback_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
});

export default config;

