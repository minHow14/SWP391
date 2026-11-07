// d:\Projects\FPT\SWP391\server\src\validators\video.validator.js
import { z } from 'zod';
import { textSchema, idSchema } from './common.validator.js';
import { tryNormalizeYoutubeVideoUrl } from '../utils/youtubeVideoUrl.js';
import {
  POST_IMAGE_URL_PATTERN, VIDEO_THUMBNAIL_MESSAGE, VIDEO_URL_MESSAGE, YOUTUBE_THUMBNAIL_HOSTS,
} from '../constants/postMedia.js';

const YOUTUBE_THUMBNAIL_PATH_PATTERN = /^\/vi\/[A-Za-z0-9_-]{11}\/[A-Za-z0-9_-]+\.(?:jpg|webp)$/;

function isYoutubeThumbnail(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && YOUTUBE_THUMBNAIL_HOSTS.includes(url.hostname)
      && YOUTUBE_THUMBNAIL_PATH_PATTERN.test(url.pathname);
  } catch { return false; }
}

const isAllowedThumbnail = (value) => !value || POST_IMAGE_URL_PATTERN.test(value) || isYoutubeThumbnail(value);

// Stores one canonical watch URL so identical videos compare equal everywhere.
const youtubeVideoUrlSchema = z.string().trim().min(1, 'Đường dẫn video không được để trống').max(500)
  .transform((value, context) => {
    const normalized = tryNormalizeYoutubeVideoUrl(value);
    if (normalized) return normalized.videoUrl;
    context.addIssue({ code: 'custom', message: VIDEO_URL_MESSAGE });
    return z.NEVER;
  });
const thumbnailUrlSchema = z.string().trim().max(500).refine(isAllowedThumbnail, VIDEO_THUMBNAIL_MESSAGE)
  .nullable().optional();

export const createVideoSchema = z.object({
  title: textSchema(255),
  video_url: youtubeVideoUrlSchema,
  thumbnail_url: thumbnailUrlSchema,
  duration: z.coerce.number().int().min(0).max(86400).optional(),
  transcript: z.string().max(100000).optional(),
  categoryId: idSchema.nullable().optional(),
  category_id: idSchema.nullable().optional(),
});

export const updateVideoSchema = z
  .object({
    title: textSchema(255).optional(),
    video_url: youtubeVideoUrlSchema.optional(),
    thumbnail_url: thumbnailUrlSchema,
    duration: z.coerce.number().int().min(0).max(86400).optional(),
    transcript: z.string().max(100000).optional(),
    categoryId: idSchema.nullable().optional(),
    category_id: idSchema.nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    'Cần ít nhất một trường để cập nhật'
  );
