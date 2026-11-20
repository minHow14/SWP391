// d:\Projects\FPT\SWP391\server\src\validators\vote.validator.js
// Schema cho bình chọn bài viết.
import { z } from 'zod';
import { idSchema } from './common.validator.js';

// Bình chọn: bắt buộc post_id và chiều vote UPVOTE/DOWNVOTE.
export const voteSchema = z.object({
  post_id: idSchema,
  vote_type: z.enum(['UPVOTE', 'DOWNVOTE']),
}).strict();
