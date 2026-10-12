import { PrismaClient } from '@prisma/client';
import config from './index.js';

/**
 * Khởi tạo PrismaClient singleton
 * Cấu hình log mức độ query, info, warn, error khi ở môi trường development
 */
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.PRISMA_LOG_QUERIES === 'true' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
};

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (!config.isProduction) {
  globalForPrisma.prisma = prisma;
}

export default prisma;

