// D:/SWP391/SWP391/server/src/config/guestIdentityConfig.js
// Cấu hình khoá ký cookie định danh khách (chưa đăng nhập) dùng cho hạn mức AI.
import { createHmac } from 'node:crypto';
import { z } from 'zod';
import './index.js';

// Chuỗi mục đích để dẫn xuất khoá riêng cho cookie khách từ secret chung.
const COOKIE_KEY_PURPOSE = 'chayxanh:ai-guest-cookie:v1';
const signingSecretSchema = z.string().min(32);
// Ưu tiên secret riêng cho cookie khách, nếu không có thì dùng JWT_SECRET; secret quá ngắn sẽ khiến signingKey là null.
const result = signingSecretSchema.safeParse(process.env.AI_GUEST_COOKIE_SECRET || process.env.JWT_SECRET);

// Tách miền khoá (domain separation) để cookie khách không thể bị dùng như access token.
export const guestIdentityConfig = Object.freeze({
  signingKey: result.success
    ? createHmac('sha256', result.data).update(COOKIE_KEY_PURPOSE).digest()
    : null,
});
