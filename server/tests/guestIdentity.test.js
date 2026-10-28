// D:/SWP391/SWP391/server/tests/guestIdentity.test.js
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app.js';
import config from '../src/config/index.js';
import { guestIdentityConfig } from '../src/config/guestIdentityConfig.js';
import { AI_GUEST_COOKIE_NAME } from '../src/constants/guestIdentity.js';
import { guestQuotaRepository } from '../src/repositories/guestQuotaRepository.js';
import { guestIdentityService } from '../src/services/guestIdentityService.js';
import { generateToken } from '../src/utils/jwt.js';

vi.mock('../src/config/guestIdentityConfig.js', async (importOriginal) => {
  const original = await importOriginal();
  return { guestIdentityConfig: { ...original.guestIdentityConfig } };
});
vi.mock('../src/config/index.js', async (importOriginal) => {
  const original = await importOriginal();
  const mutable = { ...original.default };
  return { ...original, default: mutable, config: mutable };
});

const ORIGINAL_KEY = guestIdentityConfig.signingKey;
const ORIGINAL_PRODUCTION = config.isProduction;
const cookie = (token) => `${AI_GUEST_COOKIE_NAME}=${encodeURIComponent(token)}`;
function signedToken(claims = {}, options = {}) {
  const payload = { guestId: randomUUID(), exp: Math.floor(Date.now() / 1000) + 3600, ...claims };
  if (payload.exp === undefined) delete payload.exp;
  return jwt.sign(payload, ORIGINAL_KEY, {
    algorithm: 'HS256', audience: 'ai-guest', issuer: 'chayxanh-api', ...options,
  });
}

beforeEach(() => { vi.spyOn(guestQuotaRepository, 'findUsage').mockResolvedValue(null); });
afterEach(() => {
  guestIdentityConfig.signingKey = ORIGINAL_KEY;
  config.isProduction = ORIGINAL_PRODUCTION;
  vi.restoreAllMocks();
});

describe('server-issued AI guest identity', () => {
  it('issues a cookie without trusting the client header or creating a quota record', async () => {
    const response = await request(app).get('/api/ai/usage').set('X-Guest-Id', randomUUID());
    expect(response.status).toBe(200);
    expect(response.body.data.guestId).toMatch(/^guest:[a-f0-9-]{36}$/);
    expect(guestQuotaRepository.findUsage).toHaveBeenCalledWith(expect.objectContaining({
      guestId: response.body.data.guestId,
    }));
    const header = response.headers['set-cookie'][1];
    expect(header).toContain(`${AI_GUEST_COOKIE_NAME}=`);
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Path=/api;');
    expect(header).toContain('Expires=');
    expect(header).not.toContain('Secure');
  });

  it('sets Secure when the application runs in production', async () => {
    config.isProduction = true;
    const response = await request(app).get('/api/ai/usage');
    expect(response.status).toBe(200);
    expect(response.headers['set-cookie'][0]).toContain('Secure');
  });

  it('retains the same identity when the caller changes X-Guest-Id', async () => {
    const agent = request.agent(app);
    const first = await agent.get('/api/ai/usage');
    const second = await agent.get('/api/ai/chat/usage').set('X-Guest-Id', randomUUID());
    expect(second.status).toBe(200);
    expect(second.body.data.guestId).toBe(first.body.data.guestId);
    expect(second.headers['set-cookie'][1].split(';')[0]).toBe(first.headers['set-cookie'][1].split(';')[0]);
  });

  it.each([
    ['/api/ai/usage', '/api/v1/ai/usage'],
    ['/api/v1/ai/usage', '/api/ai/usage'],
  ])('shares the guest identity across %s and %s', async (firstPath, secondPath) => {
    const agent = request.agent(app);
    const first = await agent.get(firstPath);
    const second = await agent.get(secondPath);
    const third = await agent.get(firstPath);
    expect([first.status, second.status, third.status]).toEqual([200, 200, 200]);
    expect(second.body.data.guestId).toBe(first.body.data.guestId);
    expect(third.body.data.guestId).toBe(first.body.data.guestId);
  });

  it.each(['/api/ai/usage', '/api/v1/ai/usage'])('migrates a narrow cookie without duplicate-cookie failures via %s', async (firstPath) => {
    const agent = request.agent(app);
    const guestId = randomUUID();
    const expires = Math.floor(Date.now() / 1000) + 600;
    const token = signedToken({ guestId, exp: expires });
    agent.jar.setCookie(`${cookie(token)}; Path=/api/ai`, '127.0.0.1', '/api/ai');
    const first = await agent.get(firstPath);
    const legacy = await agent.get('/api/ai/usage');
    const versioned = await agent.get('/api/v1/ai/usage');
    expect([first.status, legacy.status, versioned.status]).toEqual([200, 200, 200]);
    expect(legacy.body.data.guestId).toBe(first.body.data.guestId);
    expect(versioned.body.data.guestId).toBe(first.body.data.guestId);
    expect(first.headers['set-cookie'][0]).toContain('Path=/api/ai');
    expect(first.headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970');
    if (firstPath === '/api/ai/usage') {
      expect(first.body.data.guestId).toBe(`guest:${guestId}`);
      expect(first.headers['set-cookie'][1]).toContain(new Date(expires * 1000).toUTCString());
    }
  });

  it('rejects a modified payload without querying quota', async () => {
    const session = guestIdentityService.resolve();
    const parts = session.token.split('.');
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    parts[1] = Buffer.from(JSON.stringify({ ...claims, guestId: randomUUID() })).toString('base64url');
    const response = await request(app).get('/api/ai/usage').set('Cookie', cookie(parts.join('.')));
    expect(response.status).toBe(401);
    expect(guestQuotaRepository.findUsage).not.toHaveBeenCalled();
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it.each([
    ['expired', () => signedToken({ exp: 1 })],
    ['invalid identity', () => signedToken({ guestId: 'untrusted-id' })],
    ['missing expiry', () => signedToken({ exp: undefined })],
    ['wrong audience', () => signedToken({}, { audience: 'other-audience' })],
    ['wrong issuer', () => signedToken({}, { issuer: 'other-issuer' })],
    ['wrong algorithm', () => signedToken({}, { algorithm: 'HS384' })],
    ['access token', () => generateToken({ user_id: 1 })],
  ])('rejects a cookie with %s before accessing quota', async (_name, token) => {
    const response = await request(app).get('/api/ai/usage').set('Cookie', cookie(token()));
    expect(response.status).toBe(401);
    expect(guestQuotaRepository.findUsage).not.toHaveBeenCalled();
  });

  it.each([
    `${AI_GUEST_COOKIE_NAME}=`, `${AI_GUEST_COOKIE_NAME}=%E0%A4%A`,
    `${AI_GUEST_COOKIE_NAME}=first; ${AI_GUEST_COOKIE_NAME}=second`,
    `${AI_GUEST_COOKIE_NAME}=${'A'.repeat(1025)}`,
  ])('rejects malformed or ambiguous cookie case %#', async (header) => {
    const response = await request(app).get('/api/ai/usage').set('Cookie', header);
    expect(response.status).toBe(401);
    expect(guestQuotaRepository.findUsage).not.toHaveBeenCalled();
  });

  it('expires at the next quota reset in Vietnam time', () => {
    const now = new Date('2026-10-22T16:59:59Z');
    const session = guestIdentityService.resolve({ now });
    expect(session.expiresAt.toISOString()).toBe('2026-10-22T17:00:00.000Z');
    expect(guestIdentityService.resolve({ cookieHeader: cookie(session.token), now }).guestId).toBe(session.guestId);
    expect(() => guestIdentityService.resolve({ cookieHeader: cookie(session.token),
      now: new Date('2026-10-22T17:00:00Z') })).toThrow();
  });

  it('does not accept a guest cookie as a member access token', async () => {
    const session = guestIdentityService.resolve();
    const response = await request(app).get('/api/ai/usage').set('Authorization', `Bearer ${session.token}`);
    expect(response.status).toBe(401);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(guestQuotaRepository.findUsage).not.toHaveBeenCalled();
  });

  it('fails closed when no configured signing key is available', async () => {
    guestIdentityConfig.signingKey = null;
    const response = await request(app).get('/api/ai/usage');
    expect(response.status).toBe(503);
    expect(response.body.errorCode).toBe('AI_GUEST_IDENTITY_NOT_CONFIGURED');
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(guestQuotaRepository.findUsage).not.toHaveBeenCalled();
  });
});
