// D:/SWP391/SWP391/client/test/authRecoveryValidation.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getPasswordResetToken, passwordResetSchema, passwordResetOtpSchema } from '../src/features/auth/utils/authValidation.js';

test('reset token comes only from one valid64hex token in the URL fragment', () => {
  const token = 'a'.repeat(64);
  assert.equal(getPasswordResetToken(`#token=${token}`), token);
  for (const invalid of ['', '?token=' + token, '#token=invalid', `#token=${token}&token=${token}`]) {
    assert.equal(getPasswordResetToken(invalid), '');
  }
});

test('password reset validates confirmation and the actual bcrypt72UTF8byte boundary', () => {
  const valid = 'đ'.repeat(36);
  assert.equal(passwordResetSchema.safeParse({ newPassword: valid, confirmNewPassword: valid }).success, true);
  for (const invalid of ['short', 'a'.repeat(129), 'đ'.repeat(37), '😀'.repeat(19)]) {
    assert.equal(passwordResetSchema.safeParse({ newPassword: invalid, confirmNewPassword: invalid }).success, false);
  }
  const mismatch = passwordResetSchema.safeParse({ newPassword: 'new-password', confirmNewPassword: 'different-password' });
  assert.equal(mismatch.success, false);
  assert.equal(mismatch.error.issues[0].path[0], 'confirmNewPassword');
});

test('OTP preserves leading zeroes and accepts pasted spacing, but rejects incomplete or non-digit codes', () => {
  assert.deepEqual(passwordResetOtpSchema.parse({ otp: ' 012 345 ' }), { otp: '012345' });
  for (const otp of ['', '12345', '1234567', '12a345', 123456]) {
    assert.equal(passwordResetOtpSchema.safeParse({ otp }).success, false);
  }
});
