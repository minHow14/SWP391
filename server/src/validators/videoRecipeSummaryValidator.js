// D:/SWP391/SWP391/server/src/validators/videoRecipeSummaryValidator.js
import { z } from 'zod';
import { MAX_TRANSCRIPT_CHARACTERS, MAX_VIDEO_DURATION_SECONDS, VIDEO_RECIPE_STATUS } from '../constants/videoRecipeSummary.js';
import { videoRecipeSummaryError } from '../utils/videoRecipeSummaryError.js';

const text = (max) => z.string().trim().min(1).max(max);
const seconds = z.number().finite().nonnegative().max(MAX_VIDEO_DURATION_SECONDS);
const segmentSchema = z.object({ startSeconds: seconds, endSeconds: seconds, text: text(10_000) }).strict();
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

const references = z.array(z.number().int().nonnegative()).min(1).max(2000);
export const videoRecipeSchema = z.object({ title: text(255).nullable(),
  ingredients: z.array(z.object({ name: text(255), quantity: text(100).nullable(), unit: text(100).nullable(), sourceSegmentIndexes: references }).strict()).max(100),
  steps: z.array(z.object({ instruction: text(4000), sourceSegmentIndexes: references }).strict()).min(1).max(100),
}).strict();

export function validateVideoRecipe({ recipe, transcript }) {
  const source = transcriptSchema.parse(transcript);
  const result = videoRecipeSchema.parse(recipe);
  const referencesValid = [...result.ingredients, ...result.steps].every((item) => item.sourceSegmentIndexes.every((index) => index < source.segments.length));
  if (!referencesValid) throw videoRecipeSummaryError({ code: 'INVALID_VIDEO_RECIPE', message: 'Công thức không tham chiếu được nội dung video.' });
  return result;
}

export const createVideoRecipeSummarySchema = z.object({ videoUrl: text(2048) }).strict();
export const videoRecipeJobParamsSchema = z.object({ jobId: z.uuid() }).strict();
export const videoRecipeSummaryParamsSchema = z.object({ summaryId: z.uuid() }).strict();
export const videoRecipePageSchema = z.object({ page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10), status: z.enum(Object.values(VIDEO_RECIPE_STATUS)).optional(),
}).strict();
