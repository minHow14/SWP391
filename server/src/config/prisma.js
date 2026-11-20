// d:\Projects\FPT\SWP391\server\src\config\prisma.js
// Khởi tạo Prisma Client dùng chung cho toàn Back-end.
import { PrismaClient } from '@prisma/client';
import config from './index.js';

/**
 * Khởi tạo PrismaClient singleton
 * Cấu hình log mức độ query, info, warn, error khi ở môi trường development
 */
const prismaClientSingleton = () => {
  return new PrismaClient({
    // Chỉ bật log query khi PRISMA_LOG_QUERIES=true để tránh log quá nhiều.
    log: process.env.PRISMA_LOG_QUERIES === 'true' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
};

// Lưu client vào globalThis ngoài production để khi hot-reload không tạo thêm nhiều kết nối DB.
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (!config.isProduction) {
  globalForPrisma.prisma = prisma;
}

export default prisma;

