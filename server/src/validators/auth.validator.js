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
