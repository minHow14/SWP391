// D:/SWP391/SWP391/server/src/repositories/healthRepository.js
// Repository kiểm tra sức khỏe kết nối cơ sở dữ liệu (dùng cho trang giám sát hệ thống của admin).
import prisma from '../config/prisma.js';

export const healthRepository = {
  // Chạy truy vấn tối giản `SELECT 1` để xác nhận PostgreSQL còn phản hồi; nhận `db` để có thể chạy trong transaction.
  checkDatabase(db = prisma) {
    return db.$queryRaw`SELECT 1`;
  },
};
