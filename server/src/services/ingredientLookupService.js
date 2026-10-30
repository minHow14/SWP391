// D:/SWP391/SWP391/server/src/services/ingredientLookupService.js
import { createHash } from 'node:crypto';
import { ingredientLookupRepository as jobs } from '../repositories/ingredientLookupRepository.js';
import { guestQuotaRepository } from '../repositories/guestQuotaRepository.js';
import { guestQuotaService } from './guestQuotaService.js';
import { assertAiConfigured } from './aiTransportService.js';
import { ApiError } from '../utils/apiError.js';
import { normalizeIngredientName, generatedIngredientSchema } from '../validators/ingredientLookupValidator.js';
import { INGREDIENT_LOOKUP_FAILURE_MESSAGE, INGREDIENT_LOOKUP_RELEASED } from '../constants/ingredientLookup.js';

const hash = (text) => createHash('sha256').update(text).digest('hex');
const ownerKey = ({ userId, guestId }) => hash(userId ? `user:${userId}` : `guest:${guestId}`);

function ingredientView(row) {
  if (!row?.details) return null;
  const { ingredient_id: id, name, details } = row;
  return { id: String(id), name, category: details.category, origin: details.origin, plant: details.plant,
    description: details.description, cooking: details.cooking, aliases: details.aliases, image: details.image_url };
}

function jobView(job) {
  return { jobId: job.id, status: job.status, ingredient: ingredientView(job.ingredient),
    errorCode: job.errorCode, errorMessage: job.errorMessage };
}

async function reserve(identity, db) {
  if (identity.userId) return undefined;
  const reservation = await guestQuotaService.reserveTurn({ guestId: identity.guestId }, db);
  return { guestId: reservation.guestId, quotaDate: reservation.quotaDate.toISOString(),
    reservationRevision: reservation.reservationRevision };
}

async function refund(job, db) {
  if (job.reservation) await guestQuotaRepository.releaseTurn({ ...job.reservation,
    quotaDate: new Date(job.reservation.quotaDate) }, db);
}

const failureData = (errorCode) => ({ status: 'FAILED', ...INGREDIENT_LOOKUP_RELEASED,
  completedAt: new Date(), errorCode, errorMessage: INGREDIENT_LOOKUP_FAILURE_MESSAGE });

export const ingredientLookupService = {
  create({ payload, identity }) {
    const ingredientName = normalizeIngredientName(payload.ingredientName);
    const key = ownerKey(identity);
    const activeKey = hash(`${key}:${ingredientName.toLocaleLowerCase('vi')}`);
    return jobs.transaction(async (tx) => {
      await jobs.lockIngredient(activeKey, tx);
      const existing = await jobs.findIngredient(ingredientName, tx);
      if (existing?.details) return { status: 200, data: { jobId: null, status: 'COMPLETED',
        ingredient: ingredientView(existing), errorCode: null, errorMessage: null } };
      const active = await jobs.findActive(activeKey, tx);
      if (active) return { status: 202, data: jobView(active) };
      assertAiConfigured();
      const reservation = await reserve(identity, tx);
      const job = await jobs.create({ ownerKey: key, activeKey, ingredientName, reservation,
        sourcePhoto: payload.photo ? Buffer.from(payload.photo.imageBase64, 'base64') : undefined,
        sourceMimeType: payload.photo?.mimeType }, tx);
      return { status: 202, data: jobView(job) };
    });
  },
  async get({ id, identity }) {
    const job = await jobs.findOwned({ id, ownerKey: ownerKey(identity) });
    if (!job) throw ApiError.notFound('Không tìm thấy tác vụ tra cứu nguyên liệu.');
    return jobView(job);
  },
  complete({ job, result }) {
    const ingredient = generatedIngredientSchema.parse(result);
    return jobs.transaction(async (tx) => {
      await jobs.updateLeased({ job, data: { status: 'COMPLETED', ...INGREDIENT_LOOKUP_RELEASED,
        completedAt: new Date(), errorCode: null, errorMessage: null } }, tx);
      const saved = await jobs.saveIngredient({ job, result: ingredient }, tx);
      return jobView(await jobs.attachIngredient({ id: job.id, ingredientId: saved.ingredient_id }, tx));
    });
  },
  fail({ job, errorCode }) {
    return jobs.transaction(async (tx) => {
      await jobs.updateLeased({ job, data: failureData(errorCode) }, tx);
      await refund(job, tx);
      return { status: 'FAILED', errorCode };
    });
  },
  async recoverExpired() {
    for (const job of await jobs.findExpired()) {
      await jobs.transaction(async (tx) => {
        const updated = await jobs.failExpired({ job, data: failureData('INGREDIENT_LOOKUP_INTERRUPTED') }, tx);
        if (updated.count === 1) await refund(job, tx);
      });
    }
  },
};
