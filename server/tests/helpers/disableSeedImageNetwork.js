// D:/SWP391/SWP391/server/tests/helpers/disableSeedImageNetwork.js
// Helper vô hiệu hóa mạng khi chạy seed: mọi lệnh fetch tải ảnh đều thất bại ngay,
// để kiểm thử nhánh xử lý ảnh offline của seed mà không gọi dịch vụ bên ngoài.
// Ghi đè fetch toàn cục vì seed dùng fetch trực tiếp; ném lỗi giúp test không bao giờ phụ thuộc Internet.
globalThis.fetch = async () => {
  throw new Error('Image downloads are offline during seed integration tests.');
};
