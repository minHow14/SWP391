// D:/SWP391/SWP391/server/tests/adminReportStatusContract.test.js
// Kiểm thử hợp đồng validator cập nhật trạng thái báo cáo vi phạm ở trang admin.
import { describe, expect, it } from 'vitest';
import { updateReportStatusSchema } from '../src/validators/admin.validator.js';

// Nhóm test: trạng thái báo cáo và hành động xử lý phải nằm trong tập giá trị hợp lệ.
describe('admin report status contract', () => {
  // Các trạng thái PENDING/RESOLVED/DISMISSED phải được chấp nhận.
  it.each(['PENDING', 'RESOLVED', 'DISMISSED'])('accepts the supported report status %s', (status) => {
    expect(updateReportStatusSchema.safeParse({ status }).success).toBe(true);
  });

  // Trạng thái không hỗ trợ phải bị từ chối.
  it.each(['REJECTED', 'unknown', ''])('rejects unsupported report status %s', (status) => {
    expect(updateReportStatusSchema.safeParse({ status }).success).toBe(false);
  });

  // Chỉ cho phép hành động xử lý đã định nghĩa (HIDE_CONTENT); hành động nguy hiểm như DELETE_USER bị chặn.
  it('preserves the resolution action contract', () => {
    expect(updateReportStatusSchema.safeParse({ status: 'RESOLVED', resolutionAction: 'HIDE_CONTENT' }).success).toBe(true);
    expect(updateReportStatusSchema.safeParse({ status: 'RESOLVED', resolutionAction: 'DELETE_USER' }).success).toBe(false);
  });
});
