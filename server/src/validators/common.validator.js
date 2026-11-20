// d:\Projects\FPT\SWP391\server\src\validators\common.validator.js
// Các schema Zod dùng chung giữa nhiều validator (id, text, url, ngày sinh, params).
import { z } from 'zod';

// Id số nguyên dương; coerce vì id từ URL/query luôn là chuỗi.
export const idSchema = z.coerce.number().int().positive();
// Chuỗi đã trim, không rỗng, tối đa max ký tự.
export const textSchema = (max) => z.string().trim().min(1).max(max);
// URL hợp lệ, tối đa 500 ký tự.
export const urlSchema = z.string().trim().url().max(500);

// Tạo schema cập nhật từng phần: chặn field lạ và bắt buộc có ít nhất một field.
export const updateSchema = (shape) =>
  z.object(shape).strict().refine(
    (value) => Object.keys(value).length > 0,
    'Cần ít nhất một trường để cập nhật'
  );

// Ngày sinh YYYY-MM-DD phải là ngày có thật (chặn 2024-02-30) và không ở tương lai.
// Cộng 7 giờ để so với "hôm nay" theo giờ Việt Nam (UTC+7) thay vì UTC.
export const birthDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(value);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value <= new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
}, 'Ngày sinh không hợp lệ hoặc nằm trong tương lai');

// Params dạng :id.
export const idParamsSchema = z.object({ id: idSchema });
// Params dạng :postId.
export const postIdParamsSchema = z.object({ postId: idSchema });
