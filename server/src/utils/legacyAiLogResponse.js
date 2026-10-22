// D:/SWP391/SWP391/server/src/utils/legacyAiLogResponse.js
// API admin cũ giữ hợp đồng hiện tại cho đến khi FE chuyển sang endpoint v1 dùng camelCase.
export const legacyAiLogResponse = (log) => ({
  log_id: log.logId,
  model_name: log.modelName,
  action: log.action,
  status: log.status,
  error_feedback: log.errorFeedback,
  created_at: log.createdAt,
});
