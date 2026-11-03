// D:/SWP391/SWP391/client/src/services/aiGenerationApi.js
import apiClient from './apiClient.js';

const HISTORY_PATH = '/v1/ai-generations';
function data(envelope) {
  if (!envelope?.success || envelope.data == null) throw new Error('Phản hồi lịch sử AI không hợp lệ.');
  return envelope.data;
}

export const aiGenerationApi = {
  async list(params = {}, signal) {
    const envelope = await apiClient.get(HISTORY_PATH, { params, signal });
    const items = data(envelope);
    if (!Array.isArray(items)) throw new Error('Danh sách lịch sử AI không hợp lệ.');
    return { items, meta: envelope.meta };
  },
  async get(id, signal) {
    return data(await apiClient.get(`${HISTORY_PATH}/${encodeURIComponent(id)}`, { signal }));
  },
};
