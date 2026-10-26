// D:/SWP391/SWP391/server/src/services/guestIdentityService.js
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { guestIdentityConfig } from '../config/guestIdentityConfig.js';
import { AI_GUEST_COOKIE_NAME } from '../constants/guestIdentity.js';
import { ApiError } from '../utils/apiError.js';
import { aiGatewayError } from '../utils/aiGatewayError.js';
import { getAiQuotaPeriod } from '../utils/aiQuotaDate.js';

const COOKIE_ALGORITHM = 'HS256';
const COOKIE_AUDIENCE = 'ai-guest';
const COOKIE_ISSUER = 'chayxanh-api';
const MAX_COOKIE_LENGTH = 1024;
const MILLISECONDS_PER_SECOND = 1000;
const claimsSchema = z.object({ guestId: z.uuid(), exp: z.number().int().positive() });
const invalidCookie = () => ApiError.unauthorized('Phiên khách không hợp lệ. Vui lòng tạo lại phiên khách.');

function signingKey() {
  if (guestIdentityConfig.signingKey) return guestIdentityConfig.signingKey;
  throw aiGatewayError({ status: 503, code: 'AI_GUEST_IDENTITY_NOT_CONFIGURED',
    message: 'Phiên khách chưa sẵn sàng. Vui lòng thử lại sau.' });
}

function readCookie(header) {
  if (!header) return null;
  const cookies = header.split(';').map((part) => part.trim())
    .filter((part) => part.split('=', 1)[0] === AI_GUEST_COOKIE_NAME);
  if (!cookies.length) return null;
  if (cookies.length !== 1) throw invalidCookie();
  const value = cookies[0].slice(AI_GUEST_COOKIE_NAME.length + 1);
  if (!value || value.length > MAX_COOKIE_LENGTH) throw invalidCookie();
  try { return decodeURIComponent(value); }
  catch { throw invalidCookie(); }
}

function verifyCookie({ token, key, now }) {
  try {
    const claims = jwt.verify(token, key, { algorithms: [COOKIE_ALGORITHM],
      audience: COOKIE_AUDIENCE, issuer: COOKIE_ISSUER,
      clockTimestamp: Math.floor(now.getTime() / MILLISECONDS_PER_SECOND) });
    return claimsSchema.parse(claims);
  } catch { throw invalidCookie(); }
}

function createSession({ key, now }) {
  const guestId = randomUUID();
  const expiresAt = new Date(getAiQuotaPeriod(now).resetsAt);
  const claims = { guestId, iat: Math.floor(now.getTime() / MILLISECONDS_PER_SECOND),
    exp: Math.floor(expiresAt.getTime() / MILLISECONDS_PER_SECOND) };
  const token = jwt.sign(claims, key, { algorithm: COOKIE_ALGORITHM,
    audience: COOKIE_AUDIENCE, issuer: COOKIE_ISSUER });
  return { guestId: `guest:${guestId}`, token, expiresAt };
}

export const guestIdentityService = {
  resolve({ cookieHeader, now = new Date() } = {}) {
    const key = signingKey();
    const token = readCookie(cookieHeader);
    if (!token) return createSession({ key, now });
    const claims = verifyCookie({ token, key, now });
    return { guestId: `guest:${claims.guestId}`, token,
      expiresAt: new Date(claims.exp * MILLISECONDS_PER_SECOND) };
  },
};
