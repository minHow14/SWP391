// d:\Projects\FPT\SWP391\server\src\config\index.js
import env from './env.js';

export const config = Object.freeze({
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  clientUrl: env.CLIENT_URL,
  ziomapApiKey: env.ZIOMAP_API_KEY,
  ziomapApiUrl: env.ZIOMAP_API_URL,
  aiGuestCookieSecret: env.AI_GUEST_COOKIE_SECRET,

  // Cấu hình Database
  db: {
    url: env.DATABASE_URL,
  },

  // Cấu hình bảo mật JWT
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.REFRESH_TOKEN_SECRET || `${env.JWT_SECRET}_refresh`,
    refreshExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  },
});

export { env };
export default config;
