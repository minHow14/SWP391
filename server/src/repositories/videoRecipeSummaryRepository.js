// server/src/repositories/videoRecipeSummaryRepository.js
import prisma from '../config/prisma.js';

const SUMMARY_SELECT = { id: true, jobId: true, videoId: true, videoUrl: true, recipe: true, createdAt: true, updatedAt: true };

export const videoRecipeSummaryRepository = {
  findOwned({ id, userId }, db = prisma) {
    return db.videoRecipeSummary.findFirst({ where: { id, userId }, select: SUMMARY_SELECT });
  },
  create({ job, recipe }, db = prisma) {
    return db.videoRecipeSummary.create({ data: { jobId: job.id, userId: job.userId,
      videoId: job.videoId, videoUrl: job.videoUrl, recipe }, select: SUMMARY_SELECT });
  },
};
