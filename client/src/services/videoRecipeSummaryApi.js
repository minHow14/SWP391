// D:/SWP391/SWP391/client/src/services/videoRecipeSummaryApi.js
// API tóm tắt công thức từ video YouTube theo cơ chế job: tạo, hỏi trạng thái, thử lại, liệt kê và lấy bản tóm tắt.
import apiClient from './apiClient.js';

const JOBS_PATH = '/v1/video-recipe-summary-jobs';
// Kiểm tra envelope hợp lệ và trả về phần data, ngược lại ném lỗi.
function data(envelope) {
  if (!envelope?.success || envelope.data == null) throw new Error('Phản hồi công thức video không hợp lệ.');
  return envelope.data;
}

export const videoRecipeSummaryApi = {
  async create(videoUrl, signal) { return data(await apiClient.post(JOBS_PATH, { videoUrl }, { signal })); },
  async getJob(jobId, signal) { return data(await apiClient.get(`${JOBS_PATH}/${encodeURIComponent(jobId)}`, { signal })); },
  async retry(jobId, signal) { return data(await apiClient.post(`${JOBS_PATH}/${encodeURIComponent(jobId)}/retries`, {}, { signal })); },
  async list(params, signal) { return data(await apiClient.get(JOBS_PATH, { params, signal })); },
  async getSummary(summaryId, signal) { return data(await apiClient.get(`/v1/video-recipe-summaries/${encodeURIComponent(summaryId)}`, { signal })); },
};
