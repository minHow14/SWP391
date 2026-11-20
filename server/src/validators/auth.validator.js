// d:\Projects\FPT\SWP391\server\src\validators\auth.validator.js
// Schema cho xác thực & hồ sơ: đăng ký, đăng nhập, cập nhật hồ sơ, đổi mật khẩu, ghi cân nặng.
import { z } from 'zod';
import { idSchema, textSchema, updateSchema, birthDateSchema } from './common.validator.js';

// Đăng ký: email hợp lệ, mật khẩu 8–128 ký tự, họ tên bắt buộc.
export const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  full_name: textSchema(255),
}).strict();

// Đăng nhập: chỉ cần mật khẩu không rỗng (không lộ quy tắc độ dài khi đăng nhập).
export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
}).strict();

// Cập nhật hồ sơ: chỉ số cơ thể trong ngưỡng hợp lý, ngày sinh không ở tương lai,
// danh sách nguyên liệu dị ứng tối đa 200 và không được trùng.
export const updateMeSchema = updateSchema({
  full_name: textSchema(255).optional(),
  health_profile: z.object({
    height: z.number().min(50).max(250).nullable().optional(),
    weight: z.number().min(10).max(400).nullable().optional(),
    dob: birthDateSchema.nullable().optional(),
    gender: textSchema(20).nullable().optional(),
    health_goal: textSchema(255).nullable().optional(),
    diet_type_id: idSchema.nullable().optional(),
  }).strict().optional(),
  allergy_ids: z.array(idSchema)
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length, 'Nguyên liệu dị ứng bị trùng')
    .optional(),
});

// Đổi mật khẩu: chấp nhận nhiều tên field (camelCase/snake_case, old/current) để tương thích client cũ;
// bắt buộc có mật khẩu hiện tại và mật khẩu mới ≥ 8 ký tự.
export const changePasswordSchema = z.object({
  old_password: z.string().min(1).max(128).optional(),
  oldPassword: z.string().min(1).max(128).optional(),
  current_password: z.string().min(1).max(128).optional(),
  currentPassword: z.string().min(1).max(128).optional(),
  new_password: z.string().min(8).max(128).optional(),
  newPassword: z.string().min(8).max(128).optional(),
}).refine(
  (data) =>
    Boolean(data.old_password || data.oldPassword || data.current_password || data.currentPassword) &&
    Boolean(data.new_password || data.newPassword),
  { message: 'Mật khẩu hiện tại và mật khẩu mới (tối thiểu 8 ký tự) là bắt buộc' }
);

// Chuỗi ngày tùy chọn, phải parse được thành Date.
const optionalDateString = z
  .string()
  .trim()
  .refine((val) => !isNaN(Date.parse(val)), 'Ngày ghi nhận không hợp lệ')
  .optional();

// Ghi cân nặng trong khoảng 20–350 kg; ngày ghi nhận tùy chọn (hai kiểu tên field).
export const recordWeightSchema = z.object({
  weight: z.coerce.number().min(20, 'Cân nặng tối thiểu là 20kg').max(350, 'Cân nặng tối đa là 350kg'),
  recorded_date: optionalDateString,
  recordedDate: optionalDateString,
});
