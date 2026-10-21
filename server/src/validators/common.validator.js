// d:\Projects\FPT\SWP391\server\src\validators\common.validator.js
import { z } from 'zod';

export const idSchema = z.coerce.number().int().positive();
export const textSchema = (max) => z.string().trim().min(1).max(max);
export const urlSchema = z.string().trim().url().max(500);

export const updateSchema = (shape) =>
  z.object(shape).strict().refine(
    (value) => Object.keys(value).length > 0,
    'Cần ít nhất một trường để cập nhật'
  );

export const birthDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(value);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value <= new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
}, 'Ngày sinh không hợp lệ hoặc nằm trong tương lai');

export const idParamsSchema = z.object({ id: idSchema });
export const postIdParamsSchema = z.object({ postId: idSchema });
