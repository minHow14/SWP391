// D:/SWP391/SWP391/server/tests/adminUserStatusContract.test.js
import { describe, expect, it } from 'vitest';
import { updateUserStatusSchema } from '../src/validators/admin.validator.js';

describe('admin member status contract', () => {
  it.each(['ACTIVE', 'LOCKED', 'DELETED'])('accepts the supported account status %s', (status) => {
    expect(updateUserStatusSchema.safeParse({ status }).success).toBe(true);
  });

  it.each(['BANNED', 'PENDING', 'unknown', ''])('rejects unsupported account status %s', (status) => {
    expect(updateUserStatusSchema.safeParse({ status }).success).toBe(false);
  });

  it('rejects attempts to change fields outside the status contract', () => {
    expect(updateUserStatusSchema.safeParse({ status: 'ACTIVE', role: 1 }).success).toBe(false);
  });
});
