// D:/SWP391/SWP391/server/src/constants/foodScanner.js
// Giới hạn kích thước ảnh cho tính năng quét món ăn.
export const MAX_FOOD_SCAN_IMAGE_BYTES = 10 * 1024 * 1024;
// Base64 mã hoá 3 byte thành 4 ký tự nên độ dài chuỗi lớn hơn kích thước ảnh gốc khoảng 4/3.
export const MAX_FOOD_SCAN_BASE64_LENGTH = Math.ceil(MAX_FOOD_SCAN_IMAGE_BYTES / 3) * 4;
// Cộng thêm 64KB cho các trường JSON khác ngoài chuỗi ảnh.
export const MAX_FOOD_SCAN_JSON_BYTES = MAX_FOOD_SCAN_BASE64_LENGTH + 64 * 1024;
