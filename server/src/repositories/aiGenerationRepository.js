// d:\Projects\FPT\SWP391\server\src/repositories/aiGenerationRepository.js
import prisma from '../config/prisma.js';

const GENERATION_SELECT = {
  id: true, type: true, status: true, modelName: true, requestPayload: true,
  responsePayload: true, errorCode: true, errorMessage: true,
  completedAt: true, createdAt: true, updatedAt: true,
};
const whereOwned = ({ userId, type, status }) => ({ userId, ...(type && { type }), ...(status && { status }) });

export const aiGenerationRepository = {
  runTransaction(work, db = prisma) { return db.$transaction(work); },
  create(data, db = prisma) {
    return db.aiGeneration.create({ data, select: { id: true } });
  },
  update({ id, data }, db = prisma) {
    return db.aiGeneration.update({ where: { id }, data, select: { id: true } });
  },
  findOwned({ id, userId }, db = prisma) {
    return db.aiGeneration.findFirst({ where: { id, userId }, select: GENERATION_SELECT });
  },
  count(query, db = prisma) { return db.aiGeneration.count({ where: whereOwned(query) }); },
  findPage(query, db = prisma) {
    return db.aiGeneration.findMany({
      where: whereOwned(query), select: GENERATION_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit, take: query.limit,
    });
  },
};
