// d:\Projects\FPT\SWP391\server\src/constants/aiLogs.js
// Hằng số cho nhật ký AI (ai_logs): trạng thái, tính năng và các giới hạn phân trang/độ dài.
// Trạng thái một bản ghi nhật ký AI; RESOLVED_BY_ADMIN là lỗi đã được quản trị viên xử lý.
export const AI_LOG_STATUS = Object.freeze({
  SUCCESS: 'SUCCESS', ERROR: 'ERROR', RESOLVED_BY_ADMIN: 'RESOLVED_BY_ADMIN',
});

// Tính năng AI phát sinh bản ghi, dùng để lọc thống kê.
export const AI_LOG_FEATURE = Object.freeze({
  CHATBOT: 'chatbot', MEAL_PLANNER: 'mealPlanner', INGREDIENT_RECOGNITION: 'ingredientRecognition', OTHER: 'other',
});

// Giới hạn độ dài chuỗi lọc/tìm kiếm, kích thước trang và độ dài nội dung lỗi để tránh truy vấn/lưu trữ quá lớn.
export const AI_LOG_LIMITS = Object.freeze({
  TEXT: 100, SEARCH: 100, DEFAULT_PAGE_SIZE: 20, MAX_PAGE_SIZE: 100,
  MAX_ERROR_LENGTH: 8000, MAX_PAGE: 1_000_000,
});
