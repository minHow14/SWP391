// d:\Projects\FPT\SWP391\server\src\validators\index.js
export * from './common.validator.js';
export * from './auth.validator.js';
export * from './blog.validator.js';
export * from './video.validator.js';
export * from './comment.validator.js';
export * from './vote.validator.js';
export * from './search.validator.js';
export * from './workspace.validator.js';
export * from './report.validator.js';
export * from './admin.validator.js';
export * from './aiGenerationValidator.js';
export * from './aiLogValidator.js';
export * from './aiRequestValidator.js';
export * from './guestQuotaValidator.js';
export * from './internalApiKeyValidator.js';

import { idParamsSchema, postIdParamsSchema } from './common.validator.js';
import { registerSchema, loginSchema, updateMeSchema } from './auth.validator.js';
import { createBlogSchema, updateBlogSchema } from './blog.validator.js';
import { createVideoSchema, updateVideoSchema } from './video.validator.js';
import { createCommentSchema, updateCommentSchema } from './comment.validator.js';
import { voteSchema } from './vote.validator.js';
import { searchSchema, recommendationSchema } from './search.validator.js';
import { createReportSchema } from './report.validator.js';

export const schemas = {
  idParams: idParamsSchema,
  postIdParams: postIdParamsSchema,
  register: registerSchema,
  login: loginSchema,
  updateMe: updateMeSchema,
  createBlog: createBlogSchema,
  updateBlog: updateBlogSchema,
  createVideo: createVideoSchema,
  updateVideo: updateVideoSchema,
  createComment: createCommentSchema,
  updateComment: updateCommentSchema,
  vote: voteSchema,
  search: searchSchema,
  recommendation: recommendationSchema,
  createReport: createReportSchema,
};
