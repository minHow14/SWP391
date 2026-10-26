// D:/SWP391/SWP391/server/src/middlewares/aiIdentityMiddleware.js
import { optionalAuthenticate } from './authMiddleware.js';
import config from '../config/index.js';
import { AI_GUEST_COOKIE_NAME, AI_GUEST_COOKIE_PATH, LEGACY_AI_GUEST_COOKIE_PATH } from '../constants/guestIdentity.js';
import { guestIdentityService } from '../services/guestIdentityService.js';

export const authenticateAiCaller = optionalAuthenticate;

export function resolveAiIdentity(req, res, next) {
  if (req.user) {
    req.aiIdentity = { userId: req.user.user_id, guestId: null };
    return next();
  }
  try {
    const session = guestIdentityService.resolve({ cookieHeader: req.headers.cookie });
    req.aiIdentity = { userId: null, guestId: session.guestId };
    if (session.token) {
      const options = { httpOnly: true, secure: config.isProduction, sameSite: 'lax' };
      // Clear the narrower scope before setting its replacement for cookie-jar compatibility.
      res.clearCookie(AI_GUEST_COOKIE_NAME, { ...options, path: LEGACY_AI_GUEST_COOKIE_PATH });
      res.cookie(AI_GUEST_COOKIE_NAME, session.token, {
        ...options, path: AI_GUEST_COOKIE_PATH, expires: session.expiresAt,
      });
    }
    next();
  } catch (error) { next(error); }
}

export const getAiIdentity = (req) => req.aiIdentity;
