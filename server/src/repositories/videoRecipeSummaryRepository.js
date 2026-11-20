// server/src/repositories/videoRecipeSummaryRepository.js
// Repository đọc/ghi công thức đã tóm tắt từ video; công thức được lưu ngay trên bản ghi job tóm tắt video.
import prisma from '../config/prisma.js';

export const videoRecipeSummaryRepository = {
  // Lấy công thức của người dùng theo id job; chỉ trả về job đã có công thức (recipe khác null).
  async findOwned({ id, userId }, db = prisma) {
    const job = await db.videoRecipeSummaryJob.findFirst({
      where: { id, userId, recipe: { not: null } },
      select: {
        id: true,
        videoId: true,
        videoUrl: true,
        recipe: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    // Trả cả `id` và `jobId` (cùng giá trị) để FE dùng được cả hai cách tham chiếu.
    if (!job) return null;
    return {
      id: job.id,
      jobId: job.id,
      videoId: job.videoId,
      videoUrl: job.videoUrl,
      recipe: job.recipe,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  },
  // "Tạo" bản tóm tắt = ghi công thức vào job hiện có, vì mỗi job chỉ sinh ra đúng một công thức.
  async create({ job, recipe }, db = prisma) {
    const updated = await db.videoRecipeSummaryJob.update({
      where: { id: job.id },
      data: { recipe },
      select: {
        id: true,
        videoId: true,
        videoUrl: true,
        recipe: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return {
      id: updated.id,
      jobId: updated.id,
      videoId: updated.videoId,
      videoUrl: updated.videoUrl,
      recipe: updated.recipe,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },
};
