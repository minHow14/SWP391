// D:/SWP391/SWP391/server/src/validators/videoRecipeSummaryValidator.js
// Schema cho tóm tắt công thức từ video: bản chép lời, công thức AI sinh ra và tham số API.
import { z } from 'zod';
import { MAX_TRANSCRIPT_CHARACTERS, MAX_TRANSCRIPT_DURATION_DRIFT_SECONDS, MAX_VIDEO_DURATION_SECONDS,
  VIDEO_RECIPE_STATUS } from '../constants/videoRecipeSummary.js';
import { videoRecipeSummaryError } from '../utils/videoRecipeSummaryError.js';

const text = (max) => z.string().trim().min(1).max(max);
const seconds = z.number().finite().nonnegative().max(MAX_VIDEO_DURATION_SECONDS);
// Một đoạn lời nói có thời điểm bắt đầu/kết thúc và văn bản.
const segmentSchema = z.object({ startSeconds: seconds, endSeconds: seconds, text: text(10_000) }).strict();
// Metadata video YouTube: videoId đúng 11 ký tự, thời lượng dương.
const metadataSchema = z.object({ videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  title: text(255).nullable(), durationSeconds: seconds.positive() }).strict();
// Bản chép lời tiếng Việt: các đoạn phải theo thứ tự, không chồng lấn, nằm trong thời lượng video,
// và tổng số ký tự không vượt giới hạn để kiểm soát chi phí AI.
export const transcriptSchema = z.object({ language: z.literal('vi'),
  durationSeconds: seconds.positive(), segments: z.array(segmentSchema).min(1).max(2000),
}).strict().superRefine((value, context) => {
  let previousEnd = 0;
  let characters = 0;
  for (const segment of value.segments) {
    characters += segment.text.length;
    if (segment.startSeconds < previousEnd || segment.endSeconds <= segment.startSeconds || segment.endSeconds > value.durationSeconds) {
      context.addIssue({ code: 'custom', message: 'Các đoạn lời nói phải đúng thứ tự và nằm trong thời lượng video.' });
    }
    previousEnd = segment.endSeconds;
  }
  if (characters > MAX_TRANSCRIPT_CHARACTERS) context.addIssue({ code: 'custom', message: 'Bản chép lời vượt giới hạn.' });
});

// Danh sách chỉ số đoạn lời nói làm nguồn cho mỗi nguyên liệu/bước (bắt buộc ít nhất một).
const references = z.array(z.number().int().nonnegative()).min(1).max(2000);
// Công thức AI sinh: tối đa 100 nguyên liệu, 1–100 bước, mỗi mục đều phải dẫn nguồn từ bản chép lời.
export const videoRecipeSchema = z.object({ title: text(255).nullable(),
  ingredients: z.array(z.object({ name: text(255), quantity: text(100).nullable(), unit: text(100).nullable(), sourceSegmentIndexes: references }).strict()).max(100),
  steps: z.array(z.object({ instruction: text(4000), sourceSegmentIndexes: references }).strict()).min(1).max(100),
}).strict();

// Đảm bảo bản chép lời thuộc đúng video và phủ gần đủ thời lượng (lệch trong ngưỡng cho phép),
// tránh tóm tắt từ bản chép lời bị thiếu.
export function validateCompleteVideoTranscript({ transcript, metadata, videoId }) {
  const source = metadataSchema.parse(metadata);
  const result = transcriptSchema.parse(transcript);
  if (source.videoId !== videoId || Math.abs(source.durationSeconds - result.durationSeconds) > MAX_TRANSCRIPT_DURATION_DRIFT_SECONDS) {
    throw videoRecipeSummaryError({ status: 502, code: 'VIDEO_TRANSCRIPT_INCOMPLETE', message: 'Bản chép lời chưa khớp với toàn bộ thời lượng video.' });
  }
  return result;
}

// Đảm bảo mọi chỉ số tham chiếu trong công thức trỏ tới đoạn có thật, chặn AI bịa nội dung không có trong video.
export function validateVideoRecipe({ recipe, transcript }) {
  const source = transcriptSchema.parse(transcript);
  const result = videoRecipeSchema.parse(recipe);
  const referencesValid = [...result.ingredients, ...result.steps].every((item) => item.sourceSegmentIndexes.every((index) => index < source.segments.length));
  if (!referencesValid) throw videoRecipeSummaryError({ code: 'INVALID_VIDEO_RECIPE', message: 'Công thức không tham chiếu được nội dung video.' });
  return result;
}

// Tạo job: URL video ≤ 2048 ký tự.
export const createVideoRecipeSummarySchema = z.object({ videoUrl: text(2048) }).strict();
// Tham số jobId/summaryId phải là UUID.
export const videoRecipeJobParamsSchema = z.object({ jobId: z.uuid() }).strict();
export const videoRecipeSummaryParamsSchema = z.object({ summaryId: z.uuid() }).strict();
// Phân trang danh sách job, tối đa 100/trang, lọc theo trạng thái và videoId.
export const videoRecipePageSchema = z.object({ page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10), status: z.enum(Object.values(VIDEO_RECIPE_STATUS)).optional(),
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/).optional(),
}).strict();
