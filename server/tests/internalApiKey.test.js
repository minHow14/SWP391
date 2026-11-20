// d:\Projects\FPT\SWP391\server\tests/internalApiKey.test.js
// Kiểm thử validator khóa nội bộ X-Internal-Api-Key dùng giữa BE và AI Service.
import { expect, it } from 'vitest';
import { internalApiKeySchema } from '../src/validators/internalApiKeyValidator.js';

// Khóa ASCII in được dài 32–256 ký tự phải được chấp nhận nguyên vẹn (không trim, không biến đổi).
it.each([32, 64, 256])('accepts a %i-character printable ASCII key without modifying it', (length) => {
  const key = 'A'.repeat(length - 4) + '!_-~';
  expect(internalApiKeySchema.parse(key)).toBe(key);
});

// Khóa thiếu, quá ngắn/dài, có khoảng trắng, ký tự điều khiển hoặc ký tự Unicode phải bị từ chối;
// thông báo lỗi không được chứa giá trị khóa để tránh lộ bí mật trong log.
it.each([
  undefined, null, '', 'A'.repeat(31), 'A'.repeat(257),
  ` ${'A'.repeat(32)}`, `${'A'.repeat(32)} `, `${'A'.repeat(32)}\n`,
  `${'A'.repeat(32)}\t`, `${'A'.repeat(32)}\r`, `${'A'.repeat(32)}\0`,
  `${'A'.repeat(32)}\x7f`, `${'A'.repeat(32)}é`, `${'A'.repeat(32)}đ`,
])('rejects malformed key case %# without returning its value in the error', (key) => {
  const result = internalApiKeySchema.safeParse(key);
  expect(result.success).toBe(false);
  if (typeof key === 'string' && key.length >= 32) expect(result.error.message).not.toContain(key);
});
