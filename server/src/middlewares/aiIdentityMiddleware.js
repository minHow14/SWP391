// D:/SWP391/SWP391/server/src/middlewares/aiIdentityMiddleware.js
import { authenticate } from './authMiddleware.js';

export const authenticateAiCaller = (req, res, next) => {
  if (req.headers.authorization !== undefined) return authenticate(req, res, next);
  next();
};

export const getAiIdentity = (req) => ({
  userId: req.user?.user_id ?? null,
  guestId: req.get('X-Guest-Id') ?? `ip:${req.ip}`,
});
