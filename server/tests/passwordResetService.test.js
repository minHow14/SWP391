// D:/SWP391/SWP391/server/tests/passwordResetService.test.js
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { comparePassword } from '../src/utils/jwt.js';
import { passwordResetService } from '../src/services/passwordResetService.js';
import { passwordResetRepository as repository } from '../src/repositories/passwordResetRepository.js';
import { mailService } from '../src/services/mailService.js';
import logger from '../src/config/logger.js';

vi.mock('../src/repositories/passwordResetRepository.js', () => ({ passwordResetRepository: {
  findActiveUserByEmail: vi.fn(), createToken: vi.fn(), revokeToken: vi.fn(), transaction: vi.fn(),
  findToken: vi.fn(), lockUser: vi.fn(), consumeToken: vi.fn(), changePassword: vi.fn(), invalidateUserTokens: vi.fn(),
} }));
vi.mock('../src/services/mailService.js', () => ({ mailService: { ensureAvailable: vi.fn(), sendPasswordReset: vi.fn() } }));
vi.mock('../src/config/logger.js', () => ({ default: { warn: vi.fn() } }));
const user = { user_id: 31, email: 'reset-member@example.invalid', tokenVersion: 4 };
const delivery = { clientUrl: 'http://localhost:5173', ttlMinutes: 15 };
const token = 'a'.repeat(64);
const transaction = { transaction: true };

beforeEach(() => {
  vi.clearAllMocks();
  repository.findActiveUserByEmail.mockResolvedValue(user);
  repository.createToken.mockResolvedValue({ id: 'reset-id' });
  repository.transaction.mockImplementation((callback) => callback(transaction));
  repository.findToken.mockResolvedValue({ userId: 31, tokenVersion: 4, expiresAt: new Date(Date.now() + 60000), consumedAt: null });
  repository.lockUser.mockResolvedValue(true);
  repository.consumeToken.mockResolvedValue({ count: 1 });
  mailService.ensureAvailable.mockResolvedValue(delivery);
  mailService.sendPasswordReset.mockResolvedValue();
});

describe('requesting password recovery', () => {
  it('persists only a random token digest and sends the original through the trusted frontend fragment link', async () => {
    const result = await passwordResetService.requestReset({ email: user.email });
    const stored = repository.createToken.mock.calls[0][0];
    const message = mailService.sendPasswordReset.mock.calls[0][0];
    const link = new URL(message.resetUrl);
    const rawToken = new URLSearchParams(link.hash.slice(1)).get('token');
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(link.origin).toBe('http://localhost:5173');
    expect(link.pathname).toBe('/dat-lai-mat-khau');
    expect(link.search).toBe('');
    expect(stored).toMatchObject({ userId: 31, tokenVersion: 4, tokenHash: createHash('sha256').update(rawToken).digest('hex') });
    expect(stored.expiresAt.getTime() - Date.now()).toBeGreaterThan(14 * 60000);
    expect(JSON.stringify(stored)).not.toContain(rawToken);
    expect(JSON.stringify(result)).not.toContain(rawToken);
    expect(message.to).toBe(user.email);
  });
  it('returns the same generic result for existing and unknown addresses without mailing an unknown address', async () => {
    const known = await passwordResetService.requestReset({ email: user.email });
    repository.findActiveUserByEmail.mockResolvedValue(null);
    const unknown = await passwordResetService.requestReset({ email: 'unregistered@example.invalid' });
    expect(unknown).toEqual(known);
    expect(mailService.sendPasswordReset).toHaveBeenCalledOnce();
    expect(repository.createToken).toHaveBeenCalledOnce();
  });
  it('checks SMTP availability before any lookup so unavailable recovery does not reveal accounts', async () => {
    mailService.ensureAvailable.mockRejectedValue(Object.assign(new Error('Unavailable'), { statusCode: 503 }));
    await expect(passwordResetService.requestReset({ email: user.email })).rejects.toMatchObject({ statusCode: 503 });
    expect(repository.findActiveUserByEmail).not.toHaveBeenCalled();
  });
  it('revokes an undelivered token and keeps recipient failures out of the response and logs', async () => {
    const generic = await passwordResetService.requestReset({ email: user.email });
    mailService.sendPasswordReset.mockRejectedValue(new Error('provider message with recipient and credentials'));
    const failed = await passwordResetService.requestReset({ email: user.email });
    expect(failed).toEqual(generic);
    expect(repository.revokeToken).toHaveBeenCalledWith(expect.objectContaining({ tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }));
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('credentials');
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(user.email);
  });
});

describe('redeeming a password reset token', () => {
  it('hashes the new password, consumes the token and invalidates all outstanding tokens in one transaction', async () => {
    await passwordResetService.resetPassword({ token, newPassword: 'New-secure-password-32' });
    expect(repository.lockUser).toHaveBeenCalledWith(31, transaction);
    expect(repository.consumeToken).toHaveBeenCalledWith(expect.objectContaining({ tokenHash: createHash('sha256').update(token).digest('hex'), tokenVersion: 4 }), transaction);
    const changed = repository.changePassword.mock.calls[0][0];
    expect(changed.userId).toBe(31);
    expect(await comparePassword('New-secure-password-32', changed.passwordHash)).toBe(true);
    expect(repository.changePassword.mock.calls[0][1]).toBe(transaction);
    expect(repository.invalidateUserTokens).toHaveBeenCalledWith(expect.objectContaining({ userId: 31 }), transaction);
  });
  it.each(['missing', 'expired', 'used', 'lost race'])('uses the same rejection for a %s token without changing the password', async (state) => {
    if (state === 'missing') repository.findToken.mockResolvedValue(null);
    if (state === 'expired') repository.findToken.mockResolvedValue({ userId: 31, expiresAt: new Date(0), consumedAt: null });
    if (state === 'used') repository.findToken.mockResolvedValue({ userId: 31, expiresAt: new Date(Date.now() + 60000), consumedAt: new Date() });
    if (state === 'lost race') repository.consumeToken.mockResolvedValue({ count: 0 });
    await expect(passwordResetService.resetPassword({ token, newPassword: 'New-secure-password-32' })).rejects.toMatchObject({ statusCode: 400, errorCode: 'PASSWORD_RESET_TOKEN_INVALID' });
    expect(repository.changePassword).not.toHaveBeenCalled();
  });
});
