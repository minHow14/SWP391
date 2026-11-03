// D:/SWP391/SWP391/server/src/repositories/ingredientLookupRepository.js
import { randomUUID } from 'node:crypto';
import prisma from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { INGREDIENT_LOOKUP_RECOVERY_BATCH } from '../constants/ingredientLookup.js';

const INGREDIENT_SELECT = { ingredient_id: true, name: true, details: true };
const PUBLIC_SELECT = { id: true, status: true, errorCode: true, errorMessage: true,
  createdAt: true, updatedAt: true, completedAt: true, ingredient: { select: INGREDIENT_SELECT } };
const INTERNAL_SELECT = { ...PUBLIC_SELECT, ingredientName: true, ownerKey: true, activeKey: true,
  reservation: true, leaseToken: true, leaseExpiresAt: true, sourcePhoto: true, sourceMimeType: true };

export const ingredientLookupRepository = {
  transaction(work, db = prisma) { return db.$transaction(work); },
  findOwned({ id, ownerKey }, db = prisma) {
    return db.ingredientLookupJob.findFirst({ where: { id, ownerKey }, select: PUBLIC_SELECT });
  },
  findActive(activeKey, db = prisma) {
    return db.ingredientLookupJob.findUnique({ where: { activeKey }, select: PUBLIC_SELECT });
  },
  create(data, db = prisma) { return db.ingredientLookupJob.create({ data, select: PUBLIC_SELECT }); },
  attachIngredient({ id, ingredientId }, db = prisma) {
    return db.ingredientLookupJob.update({ where: { id }, data: { ingredientId }, select: PUBLIC_SELECT });
  },
  findIngredient(name, db = prisma) {
    return db.ingredient.findFirst({ where: { name: { equals: name, mode: 'insensitive' } },
      orderBy: { ingredient_id: 'asc' }, select: INGREDIENT_SELECT });
  },
  lockIngredient(name, db = prisma) {
    return db.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${name.toLocaleLowerCase('vi')}, 0))) AS lock`;
  },
  async saveIngredient({ job, result }, db = prisma) {
    await this.lockIngredient(job.ingredientName, db);
    const existing = await this.findIngredient(job.ingredientName, db);
    if (existing?.details) return existing;
    const ingredient = existing || await db.ingredient.create({ data: { name: job.ingredientName,
      calories_per_100g: null, protein: null, fat: null, carbs: null }, select: INGREDIENT_SELECT });
    const imageUrl = job.sourcePhoto ? `/api/workspace/ingredients/${ingredient.ingredient_id}/image` : null;
    await db.ingredientDetails.create({ data: { ingredient_id: ingredient.ingredient_id, ...result, image_url: imageUrl },
      select: { ingredient_id: true } });
    if (job.sourcePhoto) await db.ingredientImage.upsert({ where: { ingredient_id: ingredient.ingredient_id },
      create: { ingredient_id: ingredient.ingredient_id, mime_type: job.sourceMimeType, image_data: job.sourcePhoto },
      update: { mime_type: job.sourceMimeType, image_data: job.sourcePhoto }, select: { ingredient_id: true } });
    return this.findIngredient(job.ingredientName, db);
  },
  async updateLeased({ job, data }, db = prisma) {
    const updated = await db.ingredientLookupJob.updateMany({
      where: { id: job.id, status: 'PROCESSING', leaseToken: job.leaseToken, leaseExpiresAt: { gt: new Date() } }, data,
    });
    if (updated.count !== 1) throw Object.assign(ApiError.conflict('Tác vụ tra cứu đã hết quyền xử lý.'),
      { errorCode: 'INGREDIENT_LOOKUP_LEASE_LOST' });
  },
  claim(leaseMs, db = prisma) {
    return this.transaction(async (tx) => {
      const rows = await tx.$queryRaw`SELECT id FROM ingredient_lookup_jobs WHERE status = 'PENDING'
        ORDER BY created_at, id FOR UPDATE SKIP LOCKED LIMIT 1`;
      if (!rows.length) return null;
      return tx.ingredientLookupJob.update({ where: { id: rows[0].id },
        data: { status: 'PROCESSING', leaseToken: randomUUID(), leaseExpiresAt: new Date(Date.now() + leaseMs) },
        select: INTERNAL_SELECT });
    }, db);
  },
  findExpired(db = prisma) {
    return db.ingredientLookupJob.findMany({ where: { status: 'PROCESSING', leaseExpiresAt: { lte: new Date() } },
      orderBy: [{ leaseExpiresAt: 'asc' }, { id: 'asc' }], take: INGREDIENT_LOOKUP_RECOVERY_BATCH, select: INTERNAL_SELECT });
  },
  failExpired({ job, data }, db = prisma) {
    return db.ingredientLookupJob.updateMany({ where: { id: job.id, status: 'PROCESSING',
      leaseToken: job.leaseToken, leaseExpiresAt: { lte: new Date() } }, data });
  },
};
