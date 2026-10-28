// D:/SWP391/SWP391/server/tests/videoRecipeSummaryContract.test.js
import { describe, expect, it } from 'vitest';
import { transcriptSchema, validateVideoRecipe } from '../src/validators/videoRecipeSummaryValidator.js';

const transcript = { language: 'vi', durationSeconds: 60, segments: [
  { startSeconds: 0, endSeconds: 20, text: 'Cho một thìa dầu vào chảo.' },
  { startSeconds: 20, endSeconds: 60, text: 'Cho nấm vào xào chín.' },
] };
const recipe = { title: 'Nấm xào', ingredients: [{ name: 'Dầu', quantity: '1', unit: 'thìa', sourceSegmentIndexes: [0] }],
  steps: [{ instruction: 'Cho dầu vào chảo.', sourceSegmentIndexes: [0] }, { instruction: 'Xào nấm chín.', sourceSegmentIndexes: [1] }] };

describe('complete transcript and grounded recipe contracts', () => {
  it('accepts bounded Vietnamese transcript and valid segment references', () => {
    expect(transcriptSchema.parse(transcript)).toEqual(transcript);
    expect(validateVideoRecipe({ recipe, transcript })).toEqual(recipe);
  });
  it.each([
    { ...transcript, segments: [] }, { ...transcript, durationSeconds: 661 }, { ...transcript, language: 'en' },
    { ...transcript, segments: [{ startSeconds: 20, endSeconds: 10, text: 'Sai thời gian' }] },
    { ...transcript, segments: [{ startSeconds: 0, endSeconds: 61, text: 'Vượt thời lượng' }] },
    { ...transcript, segments: [...transcript.segments].reverse() },
    { ...transcript, segments: [{ startSeconds: 0, endSeconds: 60, text: 'a'.repeat(100_001) }] },
  ])('rejects incomplete or unbounded transcript', (input) => {
    expect(transcriptSchema.safeParse(input).success).toBe(false);
  });
  it('rejects empty instructions and references outside the transcript', () => {
    expect(() => validateVideoRecipe({ recipe: { ...recipe, steps: [] }, transcript })).toThrow();
    expect(() => validateVideoRecipe({ recipe: { ...recipe, steps: [{ instruction: 'Không có căn cứ', sourceSegmentIndexes: [2] }] }, transcript })).toThrow();
  });
});
