// d:\Projects\FPT\SWP391\server\src\validators\auth.validator.js
import { z } from 'zod';
import { idSchema, textSchema, updateSchema, birthDateSchema } from './common.validator.js';

export const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  full_name: textSchema(255),
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
}).strict();

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

export const recordWeightSchema = z.object({
  weight: z.coerce.number().min(20, 'Cân nặng tối thiểu là 20kg').max(350, 'Cân nặng tối đa là 350kg'),
  recorded_date: z.string().optional(),
  recordedDate: z.string().optional(),
});
