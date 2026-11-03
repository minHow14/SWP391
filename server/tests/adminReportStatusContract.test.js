// D:/SWP391/SWP391/server/tests/adminReportStatusContract.test.js
import { describe, expect, it } from 'vitest';
import { updateReportStatusSchema } from '../src/validators/admin.validator.js';

describe('admin report status contract', () => {
  it.each(['PENDING', 'RESOLVED', 'DISMISSED'])('accepts the supported report status %s', (status) => {
    expect(updateReportStatusSchema.safeParse({ status }).success).toBe(true);
  });

  it.each(['REJECTED', 'unknown', ''])('rejects unsupported report status %s', (status) => {
    expect(updateReportStatusSchema.safeParse({ status }).success).toBe(false);
  });

  it('preserves the resolution action contract', () => {
    expect(updateReportStatusSchema.safeParse({ status: 'RESOLVED', resolutionAction: 'HIDE_CONTENT' }).success).toBe(true);
    expect(updateReportStatusSchema.safeParse({ status: 'RESOLVED', resolutionAction: 'DELETE_USER' }).success).toBe(false);
  });
});
