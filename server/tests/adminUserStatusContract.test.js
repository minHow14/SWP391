// D:/SWP391/SWP391/server/tests/adminUserStatusContract.test.js
// Kiểm thử hợp đồng validator cập nhật trạng thái thành viên ở trang admin.
import { describe, expect, it } from 'vitest';
import { updateUserStatusSchema } from '../src/validators/admin.validator.js';

// Nhóm test: chỉ cho phép đổi trạng thái tài khoản trong tập giá trị được hỗ trợ.
describe('admin member status contract', () => {
  // Các trạng thái ACTIVE/LOCKED/DELETED phải được chấp nhận.
  it.each(['ACTIVE', 'LOCKED', 'DELETED'])('accepts the supported account status %s', (status) => {
    expect(updateUserStatusSchema.safeParse({ status }).success).toBe(true);
  });

  // Trạng thái lạ hoặc rỗng phải bị từ chối để DB không nhận giá trị ngoài enum.
  it.each(['BANNED', 'PENDING', 'unknown', ''])('rejects unsupported account status %s', (status) => {
    expect(updateUserStatusSchema.safeParse({ status }).success).toBe(false);
  });

  // Chặn mass-assignment: admin không được lén đổi thêm trường khác (ví dụ role) qua API đổi trạng thái.
  it('rejects attempts to change fields outside the status contract', () => {
    expect(updateUserStatusSchema.safeParse({ status: 'ACTIVE', role: 1 }).success).toBe(false);
  });
});
