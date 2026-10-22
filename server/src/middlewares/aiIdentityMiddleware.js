// D:/SWP391/SWP391/server/src/middlewares/aiIdentityMiddleware.js
import { optionalAuthenticate } from './authMiddleware.js';

export const authenticateAiCaller = optionalAuthenticate;

export const getAiIdentity = (req) => ({
  userId: req.user?.user_id ?? null,
  guestId: req.get('X-Guest-Id') ?? `ip:${req.ip}`,
});
