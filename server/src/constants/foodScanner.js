// D:/SWP391/SWP391/server/src/constants/foodScanner.js
export const MAX_FOOD_SCAN_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_FOOD_SCAN_BASE64_LENGTH = Math.ceil(MAX_FOOD_SCAN_IMAGE_BYTES / 3) * 4;
export const MAX_FOOD_SCAN_JSON_BYTES = MAX_FOOD_SCAN_BASE64_LENGTH + 64 * 1024;
