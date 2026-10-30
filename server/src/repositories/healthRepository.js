// D:/SWP391/SWP391/server/src/repositories/healthRepository.js
import prisma from '../config/prisma.js';

export const healthRepository = {
  checkDatabase(db = prisma) {
    return db.$queryRaw`SELECT 1`;
  },
};
