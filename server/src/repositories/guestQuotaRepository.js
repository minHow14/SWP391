// d:\Projects\FPT\SWP391\server\src/repositories/guestQuotaRepository.js
// Repository quản lý hạn mức lượt dùng AI theo ngày của khách (guest), xử lý an toàn khi có request đồng thời.
import prisma from '../config/prisma.js';

export const guestQuotaRepository = {
  // Chạy thao tác trong transaction.
  runTransaction(operation, db = prisma) {
    return db.$transaction(operation);
  },

  // Lấy số lượt khách đã dùng trong ngày hạn mức.
  findUsage({ guestId, quotaDate }, db = prisma) {
    return db.guestQuota.findUnique({
      where: { guestId_quotaDate: { guestId, quotaDate } },
      select: { usedCount: true },
    });
  },

  // Giữ một lượt AI; trả về null khi đã chạm hạn mức (câu UPDATE không khớp điều kiện WHERE nên không trả dòng nào).
  async reserveTurn({ guestId, quotaDate, dailyLimit }, db = prisma) {
    // Kiểm tra và tăng lượt trong cùng câu lệnh để các request đồng thời không vượt hạn mức.
    const rows = await db.$queryRaw`
      INSERT INTO guest_quota (guest_id, quota_date, used_count, updated_at)
      VALUES (${guestId}, ${quotaDate}::date, 1, CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
      ON CONFLICT (guest_id, quota_date) DO UPDATE
      SET used_count = guest_quota.used_count + 1,
          updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
      WHERE guest_quota.used_count < ${dailyLimit}::integer
      RETURNING used_count AS "usedCount", reservation_revision AS "reservationRevision"
    `;
    return rows[0] ?? null;
  },

  // Hoàn lại lượt khi gọi AI thất bại; chỉ hoàn khi reservationRevision còn khớp để không hoàn nhầm sau khi admin đã reset.
  releaseTurn({ guestId, quotaDate, reservationRevision }, db = prisma) {
    return db.guestQuota.updateMany({
      where: { guestId, quotaDate, reservationRevision, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 }, updatedAt: new Date() },
    });
  },

  // Reset số lượt về 0 và tăng reservation_revision (vô hiệu các lượt đang giữ); trả về số lượt trước khi reset để ghi log.
  async resetUsage({ guestId, quotaDate }, db = prisma) {
    const rows = await db.$queryRaw`
      WITH previous AS (
        SELECT guest_id, quota_date, used_count FROM guest_quota
        WHERE guest_id = ${guestId} AND quota_date = ${quotaDate}::date
        FOR UPDATE
      )
      UPDATE guest_quota AS quota
      SET used_count = 0, reservation_revision = quota.reservation_revision + 1,
          updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
      FROM previous
      WHERE quota.guest_id = previous.guest_id AND quota.quota_date = previous.quota_date
      RETURNING previous.used_count AS "usedCount"
    `;
    return rows[0]?.usedCount ?? 0;
  },
};
