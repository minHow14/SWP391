// D:/SWP391/SWP391/server/tests/passwordResetService.test.js
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { comparePassword } from '../src/utils/jwt.js';
import { passwordResetService } from '../src/services/passwordResetService.js';
import { passwordResetRepository as repository } from '../src/repositories/passwordResetRepository.js';

vi.mock('../src/repositories/passwordResetRepository.js', () => ({ passwordResetRepository: {
  findActiveUserByEmail: vi.fn(), createToken: vi.fn(), revokeToken: vi.fn(), transaction: vi.fn(),
  findToken: vi.fn(), lockUser: vi.fn(), consumeToken: vi.fn(), changePassword: vi.fn(), invalidateUserTokens: vi.fn(),
} }));
vi.mock('../src/services/mailService.js', () => ({ mailService: { ensureAvailable: vi.fn(), sendPasswordReset: vi.fn() } }));
vi.mock('../src/config/logger.js', () => ({ default: { warn: vi.fn() } }));
const token = 'a'.repeat(64);
const transaction = { transaction: true };

beforeEach(() => {
  vi.clearAllMocks();
  repository.transaction.mockImplementation((callback) => callback(transaction));
  repository.findToken.mockResolvedValue({ userId: 31, tokenVersion: 4, expiresAt: new Date(Date.now() + 60000), consumedAt: null });
  repository.lockUser.mockResolvedValue(true);
  repository.consumeToken.mockResolvedValue({ count: 1 });
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
