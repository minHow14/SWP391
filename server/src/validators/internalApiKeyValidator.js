// D:/SWP391/SWP391/server/src/validators/internalApiKeyValidator.js
import { z } from 'zod';

const MIN_KEY_LENGTH = 32;
const MAX_KEY_LENGTH = 256;
const INVALID_KEY_CHARACTER = /[^\x21-\x7e]/;

export const internalApiKeySchema = z.string().min(MIN_KEY_LENGTH).max(MAX_KEY_LENGTH)
  .refine((value) => !INVALID_KEY_CHARACTER.test(value), 'INTERNAL_API_KEY must use printable ASCII characters without whitespace.');
