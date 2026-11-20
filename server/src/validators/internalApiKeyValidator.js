// d:\Projects\FPT\SWP391\server\src/validators/internalApiKeyValidator.js
// Schema kiểm tra INTERNAL_API_KEY dùng xác thực BE ↔ AI Service.
import { z } from 'zod';

const MIN_KEY_LENGTH = 32;
const MAX_KEY_LENGTH = 256;
const INVALID_KEY_CHARACTER = /[^\x21-\x7e]/;

// Khóa dài 32–256 ký tự để đủ khó đoán; chỉ ký tự ASCII in được, không khoảng trắng
// (tránh lỗi khi gửi qua header HTTP).
export const internalApiKeySchema = z.string().min(MIN_KEY_LENGTH).max(MAX_KEY_LENGTH)
  .refine((value) => !INVALID_KEY_CHARACTER.test(value), 'INTERNAL_API_KEY must use printable ASCII characters without whitespace.');
