// d:\Projects\FPT\SWP391\server\src\repositories\ai.repository.js
import prisma from '../config/prisma.js';

const VN_OFFSET_HOURS = 7;

/**
 * Lấy ngày hiện tại theo múi giờ Việt Nam (UTC+7)
 * @returns {Date} Đối tượng Date với ngày theo giờ VN
 */
export const getTodayVNDate = () => {
  const now = new Date();
  const vnTime = new Date(now.getTime() + VN_OFFSET_HOURS * 60 * 60 * 1000);
  const dateStr = vnTime.toISOString().slice(0, 10);
  return new Date(`${dateStr}T00:00:00.000Z`);
};

/**
 * Trả về chuỗi ISO 8601 thời điểm reset hạn mức (0h ngày hôm sau theo giờ VN)
 * @returns {string} Ví dụ: "2026-10-23T00:00:00+07:00"
 */
export const getQuotaResetIso = () => {
  const now = new Date();
  const vnTime = new Date(now.getTime() + VN_OFFSET_HOURS * 60 * 60 * 1000);
  const tomorrow = new Date(vnTime);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowDateStr = tomorrow.toISOString().slice(0, 10);
  return `${tomorrowDateStr}T00:00:00+07:00`;
};

export const aiRepository = {
  /**
   * Lấy số lượt sử dụng hạn mức của một khách trong ngày
   */
  async getGuestUsage(guestId, date = getTodayVNDate(), limit = 3, db = prisma) {
    const quota = await db.guestQuota.findUnique({
      where: {
        guest_id_quota_date: {
          guest_id: guestId,
          quota_date: date,
        },
      },
    });

    const used = quota?.used_count ?? 0;
    const remaining = Math.max(0, limit - used);

    return {
      guestId,
      dailyLimit: limit,
      used,
      remaining,
      resetsAt: getQuotaResetIso(),
    };
  },

  /**
   * Giữ trước 1 lượt gọi AI một cách nguyên tử (Atomic reservation)
   * Trả về số lượt đã dùng sau khi giữ, hoặc null nếu đã hết hạn mức
   */
  async reserveGuestTurn(guestId, date = getTodayVNDate(), limit = 3, db = prisma) {
    const rows = await db.$queryRaw`
      INSERT INTO guest_quota (guest_id, quota_date, used_count, updated_at)
      VALUES (${guestId}, ${date}::date, 1, NOW())
      ON CONFLICT (guest_id, quota_date)
      DO UPDATE SET
        used_count = guest_quota.used_count + 1,
        updated_at = NOW()
      WHERE guest_quota.used_count < ${limit}
      RETURNING used_count;
    `;

    if (!rows || rows.length === 0) {
      return null;
    }

    const used = rows[0].used_count;
    return Math.max(0, limit - used);
  },

  /**
   * Hoàn trả 1 lượt khi quá trình xử lý AI gặp sự cố
   */
  async refundGuestTurn(guestId, date = getTodayVNDate(), db = prisma) {
    await db.$executeRaw`
      UPDATE guest_quota
      SET
        used_count = GREATEST(0, used_count - 1),
        updated_at = NOW()
      WHERE guest_id = ${guestId} AND quota_date = ${date}::date;
    `;
  },

  /**
   * Đặt lại hạn mức về 0 cho một khách cụ thể (dành cho Quản trị viên)
   */
  async resetGuestQuota(guestId, date = getTodayVNDate(), db = prisma) {
    const rows = await db.$queryRaw`
      UPDATE guest_quota
      SET
        used_count = 0,
        updated_at = NOW()
      WHERE guest_id = ${guestId} AND quota_date = ${date}::date
      RETURNING used_count;
    `;

    return rows?.length > 0;
  },

  /**
   * Ghi một bản ghi nhật ký hoạt động AI vào bảng ai_logs
   */
  async createLog(
    { modelName = 'deepseek-chat', action, status, errorFeedback = null },
    db = prisma
  ) {
    return db.ai_logs.create({
      data: {
        model_name: modelName.slice(0, 100),
        action: action.slice(0, 100),
        status: status.slice(0, 20),
        error_feedback: errorFeedback,
      },
    });
  },

  /**
   * Tìm kiếm danh sách ai_logs theo điều kiện phân trang và lọc
   */
  async findLogs({ where = {}, skip = 0, take = 20, orderBy = { created_at: 'desc' } }, db = prisma) {
    return db.ai_logs.findMany({
      where,
      skip,
      take,
      orderBy,
    });
  },

  /**
   * Đếm tổng số bản ghi ai_logs theo điều kiện lọc
   */
  async countLogs(where = {}, db = prisma) {
    return db.ai_logs.count({ where });
  },

  /**
   * Cập nhật một bản ghi ai_log (can thiệp quản trị)
   */
  async updateLog(logId, data, db = prisma) {
    return db.ai_logs.update({
      where: { log_id: Number(logId) },
      data,
    });
  },

  /**
   * Thống kê tổng hợp số liệu hoạt động AI theo ngày, chức năng và mô hình
   */
  async getLogStats({ dateFrom = null, dateTo = null }, db = prisma) {
    const where = {};
    if (dateFrom) {
      where.created_at = { ...(where.created_at || {}), gte: new Date(dateFrom) };
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setUTCHours(23, 59, 59, 999);
      where.created_at = { ...(where.created_at || {}), lte: endOfDay };
    }

    const [total, successCount, errorCount, allLogs] = await Promise.all([
      db.ai_logs.count({ where }),
      db.ai_logs.count({ where: { ...where, status: 'SUCCESS' } }),
      db.ai_logs.count({ where: { ...where, status: 'ERROR' } }),
      db.ai_logs.findMany({
        where,
        select: {
          action: true,
          model_name: true,
          status: true,
          created_at: true,
        },
        orderBy: { created_at: 'asc' },
      }),
    ]);

    const successRate = total > 0 ? Math.round((successCount / total) * 1000) / 10 : null;

    // Phân nhóm theo ngày
    const byDayMap = new Map();
    // Phân nhóm theo chức năng
    const byFeatureMap = new Map();
    // Phân nhóm theo model
    const byModelMap = new Map();

    for (const log of allLogs) {
      const dayKey = log.created_at ? log.created_at.toISOString().slice(0, 10) : 'unknown';
      const isSuccess = log.status === 'SUCCESS';

      // 1. By Day
      const dayData = byDayMap.get(dayKey) || { date: dayKey, total: 0, success: 0, error: 0 };
      dayData.total += 1;
      if (isSuccess) dayData.success += 1;
      else dayData.error += 1;
      byDayMap.set(dayKey, dayData);

      // 2. By Feature
      let feature = 'other';
      if (log.action?.toUpperCase().startsWith('CHAT')) feature = 'chatbot';
      else if (log.action?.toUpperCase().startsWith('MEAL_PLANNER')) feature = 'meal_planner';

      const featData = byFeatureMap.get(feature) || { feature, total: 0, success: 0, error: 0 };
      featData.total += 1;
      if (isSuccess) featData.success += 1;
      else featData.error += 1;
      byFeatureMap.set(feature, featData);

      // 3. By Model
      const model = log.model_name || 'deepseek-chat';
      const modelData = byModelMap.get(model) || { model_name: model, total: 0, success: 0, error: 0 };
      modelData.total += 1;
      if (isSuccess) modelData.success += 1;
      else modelData.error += 1;
      byModelMap.set(model, modelData);
    }

    const calcRate = (item) => ({
      ...item,
      success_rate: item.total > 0 ? Math.round((item.success / item.total) * 1000) / 10 : null,
    });

    return {
      total,
      success: successCount,
      error: errorCount,
      success_rate: successRate,
      date_from: dateFrom,
      date_to: dateTo,
      by_day: Array.from(byDayMap.values()).map(calcRate),
      by_feature: Array.from(byFeatureMap.values()).map(calcRate),
      by_model: Array.from(byModelMap.values()).map(calcRate),
    };
  },
};
