// server/src/repositories/videoRecipeSummaryRepository.js
import prisma from '../config/prisma.js';

export const videoRecipeSummaryRepository = {
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
