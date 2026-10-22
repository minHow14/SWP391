// D:/SWP391/SWP391/server/src/repositories/guestQuotaRepository.js
import prisma from '../config/prisma.js';

export const guestQuotaRepository = {
  runTransaction(operation, db = prisma) {
    return db.$transaction(operation);
  },

  findUsage({ guestId, quotaDate }, db = prisma) {
    return db.guestQuota.findUnique({
      where: { guestId_quotaDate: { guestId, quotaDate } },
      select: { usedCount: true },
    });
  },

  async reserveTurn({ guestId, quotaDate, dailyLimit }, db = prisma) {
    // Kiểm tra và tăng lượt trong cùng câu lệnh để các request đồng thời không vượt hạn mức.
    const rows = await db.$queryRaw`
      INSERT INTO guest_quota (guest_id, quota_date, used_count, updated_at)
      VALUES (${guestId}, ${quotaDate}::date, 1, CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
      ON CONFLICT (guest_id, quota_date) DO UPDATE
      SET used_count = guest_quota.used_count + 1,
          updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
      WHERE guest_quota.used_count < ${dailyLimit}::integer
      RETURNING used_count AS "usedCount"
    `;
    return rows[0]?.usedCount ?? null;
  },

  releaseTurn({ guestId, quotaDate }, db = prisma) {
    return db.guestQuota.updateMany({
      where: { guestId, quotaDate, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 }, updatedAt: new Date() },
    });
  },

  async resetUsage({ guestId, quotaDate }, db = prisma) {
    const rows = await db.$queryRaw`
      DELETE FROM guest_quota
      WHERE guest_id = ${guestId} AND quota_date = ${quotaDate}::date
      RETURNING used_count AS "usedCount"
    `;
    return rows[0]?.usedCount ?? 0;
  },
};
