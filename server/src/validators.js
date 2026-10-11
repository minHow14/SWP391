import { z } from 'zod';

const id = z.coerce.number().int().positive();
const text = (max) => z.string().trim().min(1).max(max);
const url = z.string().trim().url().max(500);
const update = (shape) => z.object(shape).strict().refine((value) => Object.keys(value).length > 0, 'Cần ít nhất một trường để cập nhật');
export const schemas = {
  idParams: z.object({ id }), postIdParams: z.object({ postId: id }),
  register: z.object({ email: z.string().trim().email().max(255), password: z.string().min(8).max(128), full_name: text(255) }).strict(),
  login: z.object({ email: z.string().trim().email().max(255), password: z.string().min(1).max(128) }).strict(),
  createBlog: z.object({ title: text(255), content: text(50000), attached_video_id: id.nullable().optional() }).strict(),
  updateBlog: update({ title: text(255).optional(), content: text(50000).optional(), attached_video_id: id.nullable().optional() }),
  createVideo: z.object({ title: text(255), video_url: url, thumbnail_url: url.nullable().optional(), duration: z.coerce.number().int().min(0).max(86400).optional(), transcript: z.string().max(100000).optional() }).strict(),
  updateVideo: update({ title: text(255).optional(), video_url: url.optional(), thumbnail_url: url.nullable().optional(), duration: z.coerce.number().int().min(0).max(86400).optional(), transcript: z.string().max(100000).optional() }),
  createComment: z.object({ post_id: id, content: text(5000) }).strict(), updateComment: z.object({ content: text(5000) }).strict(),
  vote: z.object({ post_id: id, vote_type: z.enum(['UPVOTE', 'DOWNVOTE']) }).strict(),
  search: z.object({ q: text(200) }).strict(), recommendation: z.object({ keyword: text(200) }).strict(),
};
