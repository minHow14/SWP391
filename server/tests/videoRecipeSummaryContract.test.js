// D:/SWP391/SWP391/server/tests/videoRecipeSummaryContract.test.js
// Kiểm thử hợp đồng transcript video và công thức tóm tắt phải bám đúng các đoạn transcript.
import { describe, expect, it } from 'vitest';
import { transcriptSchema, validateVideoRecipe } from '../src/validators/videoRecipeSummaryValidator.js';

// Transcript mẫu tiếng Việt và công thức tham chiếu các đoạn hợp lệ, dùng chung cho các test.
const transcript = { language: 'vi', durationSeconds: 60, segments: [
  { startSeconds: 0, endSeconds: 20, text: 'Cho một thìa dầu vào chảo.' },
  { startSeconds: 20, endSeconds: 60, text: 'Cho nấm vào xào chín.' },
] };
const recipe = { title: 'Nấm xào', ingredients: [{ name: 'Dầu', quantity: '1', unit: 'thìa', sourceSegmentIndexes: [0] }],
  steps: [{ instruction: 'Cho dầu vào chảo.', sourceSegmentIndexes: [0] }, { instruction: 'Xào nấm chín.', sourceSegmentIndexes: [1] }] };

// Nhóm test: transcript phải đầy đủ, có giới hạn; công thức phải có căn cứ từ transcript.
describe('complete transcript and grounded recipe contracts', () => {
  // Transcript hợp lệ và công thức tham chiếu đúng chỉ số đoạn phải được chấp nhận nguyên vẹn.
  it('accepts bounded Vietnamese transcript and valid segment references', () => {
    expect(transcriptSchema.parse(transcript)).toEqual(transcript);
    expect(validateVideoRecipe({ recipe, transcript })).toEqual(recipe);
  });
  // Transcript rỗng, quá dài, sai ngôn ngữ, thời gian ngược/vượt thời lượng, sai thứ tự hoặc text quá lớn phải bị từ chối
  // để không gửi dữ liệu không giới hạn sang AI.
  it.each([
    { ...transcript, segments: [] }, { ...transcript, durationSeconds: 661 }, { ...transcript, language: 'en' },
    { ...transcript, segments: [{ startSeconds: 20, endSeconds: 10, text: 'Sai thời gian' }] },
    { ...transcript, segments: [{ startSeconds: 0, endSeconds: 61, text: 'Vượt thời lượng' }] },
    { ...transcript, segments: [...transcript.segments].reverse() },
    { ...transcript, segments: [{ startSeconds: 0, endSeconds: 60, text: 'a'.repeat(100_001) }] },
  ])('rejects incomplete or unbounded transcript', (input) => {
    expect(transcriptSchema.safeParse(input).success).toBe(false);
  });
  // Công thức không có bước hoặc tham chiếu đoạn không tồn tại phải bị từ chối, tránh AI "bịa" nội dung.
  it('rejects empty instructions and references outside the transcript', () => {
    expect(() => validateVideoRecipe({ recipe: { ...recipe, steps: [] }, transcript })).toThrow();
    expect(() => validateVideoRecipe({ recipe: { ...recipe, steps: [{ instruction: 'Không có căn cứ', sourceSegmentIndexes: [2] }] }, transcript })).toThrow();
  });
});
