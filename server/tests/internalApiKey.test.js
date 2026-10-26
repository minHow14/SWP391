// d:\Projects\FPT\SWP391\server\tests/internalApiKey.test.js
import { expect, it } from 'vitest';
import { internalApiKeySchema } from '../src/validators/internalApiKeyValidator.js';

it.each([32, 64, 256])('accepts a %i-character printable ASCII key without modifying it', (length) => {
  const key = 'A'.repeat(length - 4) + '!_-~';
  expect(internalApiKeySchema.parse(key)).toBe(key);
});

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
