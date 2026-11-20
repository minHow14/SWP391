// D:/SWP391/SWP391/server/src/services/guestIdentityService.js
// Quản lý danh tính khách (guest) bằng cookie JWT ký HMAC để áp hạn mức AI mà không cần đăng nhập.
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { guestIdentityConfig } from '../config/guestIdentityConfig.js';
import { AI_GUEST_COOKIE_NAME } from '../constants/guestIdentity.js';
import { ApiError } from '../utils/apiError.js';
import { aiGatewayError } from '../utils/aiGatewayError.js';
import { getAiQuotaPeriod } from '../utils/aiQuotaDate.js';

// Cố định thuật toán, audience và issuer để token của tính năng khác không dùng thay cookie khách được.
const COOKIE_ALGORITHM = 'HS256';
const COOKIE_AUDIENCE = 'ai-guest';
const COOKIE_ISSUER = 'chayxanh-api';
// Giới hạn độ dài cookie để chặn payload quá lớn trước khi verify.
const MAX_COOKIE_LENGTH = 1024;
const MILLISECONDS_PER_SECOND = 1000;
const claimsSchema = z.object({ guestId: z.uuid(), exp: z.number().int().positive() });
const invalidCookie = () => ApiError.unauthorized('Phiên khách không hợp lệ. Vui lòng tạo lại phiên khách.');

// Lấy khóa ký cookie; thiếu cấu hình thì báo 503 thay vì phát cookie không an toàn.
function signingKey() {
  if (guestIdentityConfig.signingKey) return guestIdentityConfig.signingKey;
  throw aiGatewayError({ status: 503, code: 'AI_GUEST_IDENTITY_NOT_CONFIGURED',
    message: 'Phiên khách chưa sẵn sàng. Vui lòng thử lại sau.' });
}

// Đọc cookie khách từ header Cookie; có nhiều cookie trùng tên thì coi là giả mạo và từ chối.
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

// Xác minh chữ ký, thời hạn và cấu trúc claims; mọi lỗi đều quy về "phiên khách không hợp lệ".
function verifyCookie({ token, key, now }) {
  try {
    const claims = jwt.verify(token, key, { algorithms: [COOKIE_ALGORITHM],
      audience: COOKIE_AUDIENCE, issuer: COOKIE_ISSUER,
      clockTimestamp: Math.floor(now.getTime() / MILLISECONDS_PER_SECOND) });
    return claimsSchema.parse(claims);
  } catch { throw invalidCookie(); }
}

// Tạo phiên khách mới; cookie hết hạn đúng lúc hạn mức ngày được đặt lại.
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
  // Trả về danh tính khách: chưa có cookie thì tạo phiên mới, có thì xác minh; guestId có tiền tố `guest:` để không trùng ID người dùng.
  resolve({ cookieHeader, now = new Date() } = {}) {
    const key = signingKey();
    const token = readCookie(cookieHeader);
    if (!token) return createSession({ key, now });
    const claims = verifyCookie({ token, key, now });
    return { guestId: `guest:${claims.guestId}`, token,
      expiresAt: new Date(claims.exp * MILLISECONDS_PER_SECOND) };
  },
};
