// D:/SWP391/SWP391/server/src/constants/videoRecipeSummary.js
// Hằng số cho tính năng tóm tắt công thức từ video: giới hạn thời lượng, phiên bản pipeline, trạng thái/giai đoạn job.
// Chỉ nhận video tối đa 11 phút để giới hạn chi phí phiên âm và tóm tắt.
export const MAX_VIDEO_DURATION_SECONDS = 660;
// Tăng phiên bản khi đổi logic pipeline để không tái sử dụng kết quả cũ.
export const VIDEO_RECIPE_PIPELINE_VERSION = '1';
export const VIDEO_RECIPE_STATUS = Object.freeze({ PENDING: 'PENDING', PROCESSING: 'PROCESSING', COMPLETED: 'COMPLETED', FAILED: 'FAILED' });
export const VIDEO_RECIPE_STAGE = Object.freeze({ VALIDATING_VIDEO: 'VALIDATING_VIDEO', FETCHING_CAPTIONS: 'FETCHING_CAPTIONS', FETCHING_AUDIO: 'FETCHING_AUDIO',
  TRANSCRIBING: 'TRANSCRIBING', SUMMARIZING: 'SUMMARIZING', SAVING_RESULT: 'SAVING_RESULT' });
// Giới hạn độ dài transcript, độ lệch thời lượng cho phép và kích thước phản hồi/metadata để chống dữ liệu bất thường.
export const MAX_TRANSCRIPT_CHARACTERS = 100_000;
export const MAX_TRANSCRIPT_DURATION_DRIFT_SECONDS = 2;
export const MAX_AI_RESPONSE_BYTES = 1_048_576;
export const MAX_METADATA_BYTES = 4_194_304;
