// D:/SWP391/SWP391/server/src/repositories/ingredientLookupRepository.js
// Repository hàng đợi job tra cứu nguyên liệu bằng AI và lưu kết quả (nguyên liệu, chi tiết, ảnh, dinh dưỡng) vào từ điển.
import { randomUUID } from 'node:crypto';
import prisma from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { INGREDIENT_LOOKUP_RECOVERY_BATCH } from '../constants/ingredientLookup.js';

// Các cột dinh dưỡng trên 100 g.
const NUTRITION_SELECT = { calories_per_100g: true, protein: true, fat: true, carbs: true };
const INGREDIENT_SELECT = { ingredient_id: true, name: true, details: true, ...NUTRITION_SELECT };
// Ánh xạ tên trường dinh dưỡng từ AI sang tên cột DB.
const NUTRITION_COLUMNS = Object.freeze({ calories: 'calories_per_100g', protein: 'protein', fat: 'fat', carbs: 'carbs' });
// Điều kiện OR: nguyên liệu thiếu ít nhất một cột dinh dưỡng.
const MISSING_NUTRITION = Object.values(NUTRITION_COLUMNS).map((column) => ({ [column]: null }));

/** Chỉ ánh xạ giá trị AI vào cột đang trống, để số liệu seed hoặc do admin nhập không bao giờ bị ghi đè. */
function missingNutritionData(ingredient, nutrition) {
  if (!nutrition) return {};
  return Object.fromEntries(Object.entries(NUTRITION_COLUMNS)
    .filter(([, column]) => ingredient[column] === null)
    .map(([field, column]) => [column, nutrition[field]]));
}
// Cột công khai của job tra cứu (trả cho client).
const PUBLIC_SELECT = { id: true, status: true, errorCode: true, errorMessage: true,
  createdAt: true, updatedAt: true, completedAt: true, ingredient: { select: INGREDIENT_SELECT } };
// Cột nội bộ cho worker: khóa sở hữu, lease, ảnh gốc người dùng tải lên...
const INTERNAL_SELECT = { ...PUBLIC_SELECT, ingredientName: true, ownerKey: true, activeKey: true,
  reservation: true, leaseToken: true, leaseExpiresAt: true, sourcePhoto: true, sourceMimeType: true };

export const ingredientLookupRepository = {
  // Chạy thao tác trong transaction.
  transaction(work, db = prisma) { return db.$transaction(work); },
  // Lấy job theo id thuộc chủ sở hữu (người dùng hoặc khách).
  findOwned({ id, ownerKey }, db = prisma) {
    return db.ingredientLookupJob.findFirst({ where: { id, ownerKey }, select: PUBLIC_SELECT });
  },
  // Tìm job đang hoạt động theo activeKey (giới hạn mỗi chủ sở hữu một job chạy cùng lúc).
  findActive(activeKey, db = prisma) {
    return db.ingredientLookupJob.findUnique({ where: { activeKey }, select: PUBLIC_SELECT });
  },
  // Tạo job tra cứu.
  create(data, db = prisma) { return db.ingredientLookupJob.create({ data, select: PUBLIC_SELECT }); },
  // Gắn nguyên liệu đã có sẵn vào job (khi không cần gọi AI).
  attachIngredient({ id, ingredientId }, db = prisma) {
    return db.ingredientLookupJob.update({ where: { id }, data: { ingredientId }, select: PUBLIC_SELECT });
  },
  // Tìm nguyên liệu theo tên không phân biệt hoa thường; lấy bản ghi cũ nhất nếu trùng.
  findIngredient(name, db = prisma) {
    return db.ingredient.findFirst({ where: { name: { equals: name, mode: 'insensitive' } },
      orderBy: { ingredient_id: 'asc' }, select: INGREDIENT_SELECT });
  },
  // Advisory lock theo tên (viết thường kiểu tiếng Việt) trong transaction để hai job cùng tên không tạo nguyên liệu trùng.
  lockIngredient(name, db = prisma) {
    return db.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${name.toLocaleLowerCase('vi')}, 0))) AS lock`;
  },
  // Lưu kết quả AI vào từ điển nguyên liệu dưới khóa theo tên.
  async saveIngredient({ job, result }, db = prisma) {
    await this.lockIngredient(job.ingredientName, db);
    const existing = await this.findIngredient(job.ingredientName, db);
    // Nguyên liệu đã có chi tiết (job khác vừa lưu) thì dùng lại, không ghi đè.
    if (existing?.details) return existing;
    const { nutritionPer100g, ...details } = result;
    const ingredient = existing || await db.ingredient.create({ data: { name: job.ingredientName,
      calories_per_100g: null, protein: null, fat: null, carbs: null }, select: INGREDIENT_SELECT });
    await this.fillMissingNutrition({ ingredient, nutrition: nutritionPer100g }, db);
    // Ảnh được phục vụ qua API thay vì lưu URL ngoài.
    const imageUrl = job.sourcePhoto ? `/api/workspace/ingredients/${ingredient.ingredient_id}/image` : null;
    await db.ingredientDetails.create({ data: { ingredient_id: ingredient.ingredient_id, ...details, image_url: imageUrl },
      select: { ingredient_id: true } });
    if (job.sourcePhoto) await db.ingredientImage.upsert({ where: { ingredient_id: ingredient.ingredient_id },
      create: { ingredient_id: ingredient.ingredient_id, mime_type: job.sourceMimeType, image_data: job.sourcePhoto },
      update: { mime_type: job.sourceMimeType, image_data: job.sourcePhoto }, select: { ingredient_id: true } });
    return this.findIngredient(job.ingredientName, db);
  },
  // Bổ sung dinh dưỡng còn trống; trả về số dòng đã cập nhật.
  async fillMissingNutrition({ ingredient, nutrition }, db = prisma) {
    const data = missingNutritionData(ingredient, nutrition);
    if (!Object.keys(data).length) return 0;
    // Kiểm tra lại các cột trống trong điều kiện update để chống trường hợp có người nhập tay đồng thời giữa lúc đọc và ghi.
    const updated = await db.ingredient.updateMany({ where: { ingredient_id: ingredient.ingredient_id,
      AND: Object.keys(data).map((column) => ({ [column]: null })) }, data });
    return updated.count;
  },
  // Lấy các nguyên liệu đã có chi tiết nhưng còn thiếu dinh dưỡng (đầu vào của công cụ backfill).
  findMissingNutrition(db = prisma) {
    return db.ingredient.findMany({ where: { details: { isNot: null }, OR: MISSING_NUTRITION },
      orderBy: { ingredient_id: 'asc' }, select: { ingredient_id: true, name: true, ...NUTRITION_SELECT } });
  },
  // Cập nhật job khi còn giữ lease hợp lệ; ngược lại ném lỗi mất lease để worker dừng.
  async updateLeased({ job, data }, db = prisma) {
    const updated = await db.ingredientLookupJob.updateMany({
      where: { id: job.id, status: 'PROCESSING', leaseToken: job.leaseToken, leaseExpiresAt: { gt: new Date() } }, data,
    });
    if (updated.count !== 1) throw Object.assign(ApiError.conflict('Tác vụ tra cứu đã hết quyền xử lý.'),
      { errorCode: 'INGREDIENT_LOOKUP_LEASE_LOST' });
  },
  // Nhận một job PENDING; FOR UPDATE SKIP LOCKED để nhiều worker không nhận trùng job.
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
  // Lấy một lô job PROCESSING đã hết hạn lease để khôi phục.
  findExpired(db = prisma) {
    return db.ingredientLookupJob.findMany({ where: { status: 'PROCESSING', leaseExpiresAt: { lte: new Date() } },
      orderBy: [{ leaseExpiresAt: 'asc' }, { id: 'asc' }], take: INGREDIENT_LOOKUP_RECOVERY_BATCH, select: INTERNAL_SELECT });
  },
  // Đánh dấu thất bại job hết hạn; điều kiện lease đảm bảo không ghi đè nếu worker vừa gia hạn.
  failExpired({ job, data }, db = prisma) {
    return db.ingredientLookupJob.updateMany({ where: { id: job.id, status: 'PROCESSING',
      leaseToken: job.leaseToken, leaseExpiresAt: { lte: new Date() } }, data });
  },
};
