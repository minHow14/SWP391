// d:\Projects\FPT\SWP391\server\src\validators\notification.validator.js
// Schema query cho danh sách thông báo.
import { z } from 'zod';

// Phân trang tối đa 50/trang; is_read/isRead nhận chuỗi 'true'/'false' từ query và chuyển sang boolean.
export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  is_read: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  ),
  isRead: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  ),
});
