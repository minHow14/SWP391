// d:\Projects\FPT\SWP391\server\src\validators\vote.validator.js
import { z } from 'zod';
import { idSchema } from './common.validator.js';

export const voteSchema = z.object({
  post_id: idSchema,
  vote_type: z.enum(['UPVOTE', 'DOWNVOTE']),
}).strict();
