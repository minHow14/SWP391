// d:\Projects\FPT\SWP391\server\src\validators\search.validator.js
import { z } from 'zod';
import { textSchema } from './common.validator.js';

export const searchSchema = z.object({
  q: textSchema(200),
}).strict();

export const recommendationSchema = z.object({
  keyword: textSchema(200),
}).strict();
