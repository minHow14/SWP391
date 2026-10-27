// D:/SWP391/SWP391/server/src/constants/aiLogs.js
export const AI_LOG_STATUS = Object.freeze({
  SUCCESS: 'SUCCESS', ERROR: 'ERROR', RESOLVED_BY_ADMIN: 'RESOLVED_BY_ADMIN',
});

export const AI_LOG_FEATURE = Object.freeze({
  CHATBOT: 'chatbot', MEAL_PLANNER: 'mealPlanner', INGREDIENT_RECOGNITION: 'ingredientRecognition', OTHER: 'other',
});

export const AI_LOG_LIMITS = Object.freeze({
  TEXT: 100, SEARCH: 100, DEFAULT_PAGE_SIZE: 20, MAX_PAGE_SIZE: 100,
  MAX_ERROR_LENGTH: 8000, MAX_PAGE: 1_000_000,
});
