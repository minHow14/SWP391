// d:\Projects\FPT\SWP391\server\src\validators\video.validator.js
// Schema cho video công thức: chỉ chấp nhận video YouTube và ảnh thumbnail từ nguồn được phép.
import { z } from 'zod';
import { textSchema, idSchema } from './common.validator.js';
import { tryNormalizeYoutubeVideoUrl } from '../utils/youtubeVideoUrl.js';
import {
  POST_IMAGE_URL_PATTERN, VIDEO_THUMBNAIL_MESSAGE, VIDEO_URL_MESSAGE, YOUTUBE_THUMBNAIL_HOSTS,
} from '../constants/postMedia.js';

// Đường dẫn ảnh thumbnail YouTube: /vi/<videoId 11 ký tự>/<tên ảnh>.jpg|webp.
const YOUTUBE_THUMBNAIL_PATH_PATTERN = /^\/vi\/[A-Za-z0-9_-]{11}\/[A-Za-z0-9_-]+\.(?:jpg|webp)$/;

// Thumbnail YouTube hợp lệ: HTTPS, host nằm trong danh sách cho phép và đúng mẫu đường dẫn.
function isYoutubeThumbnail(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && YOUTUBE_THUMBNAIL_HOSTS.includes(url.hostname)
      && YOUTUBE_THUMBNAIL_PATH_PATTERN.test(url.pathname);
  } catch { return false; }
}

// Thumbnail được phép: để trống, ảnh upload nội bộ, hoặc ảnh từ YouTube (chặn ảnh từ host tùy ý).
const isAllowedThumbnail = (value) => !value || POST_IMAGE_URL_PATTERN.test(value) || isYoutubeThumbnail(value);

// Lưu một URL xem chuẩn duy nhất để cùng một video luôn so sánh bằng nhau ở mọi nơi.
const youtubeVideoUrlSchema = z.string().trim().min(1, 'Đường dẫn video không được để trống').max(500)
  .transform((value, context) => {
    const normalized = tryNormalizeYoutubeVideoUrl(value);
    if (normalized) return normalized.videoUrl;
    context.addIssue({ code: 'custom', message: VIDEO_URL_MESSAGE });
    return z.NEVER;
  });
// Thumbnail tùy chọn, tối đa 500 ký tự và phải thuộc nguồn được phép.
const thumbnailUrlSchema = z.string().trim().max(500).refine(isAllowedThumbnail, VIDEO_THUMBNAIL_MESSAGE)
  .nullable().optional();

// Đăng video: thời lượng tối đa 24 giờ (86400 giây), transcript ≤ 100000 ký tự.
export const createVideoSchema = z.object({
  title: textSchema(255),
  video_url: youtubeVideoUrlSchema,
  thumbnail_url: thumbnailUrlSchema,
  duration: z.coerce.number().int().min(0).max(86400).optional(),
  transcript: z.string().max(100000).optional(),
  categoryId: idSchema.nullable().optional(),
  category_id: idSchema.nullable().optional(),
});

// Sửa video: field tùy chọn nhưng phải có ít nhất một field.
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
