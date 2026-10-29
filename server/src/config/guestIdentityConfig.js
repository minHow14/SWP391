// server/src/config/guestIdentityConfig.js
import { createHmac } from 'node:crypto';
import { z } from 'zod';
import './index.js';

const COOKIE_KEY_PURPOSE = 'chayxanh:ai-guest-cookie:v1';
const signingSecretSchema = z.string().min(32);
const result = signingSecretSchema.safeParse(process.env.AI_GUEST_COOKIE_SECRET || process.env.JWT_SECRET);

// Domain separation prevents a guest cookie from serving as an access token.
export const guestIdentityConfig = Object.freeze({
  signingKey: result.success
    ? createHmac('sha256', result.data).update(COOKIE_KEY_PURPOSE).digest()
    : null,
});
