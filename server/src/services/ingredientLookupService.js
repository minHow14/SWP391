// D:/SWP391/SWP391/server/src/services/ingredientLookupService.js
// Nghiệp vụ tra cứu nguyên liệu bằng AI: tạo job (có trừ hạn mức khách), xem trạng thái, hoàn tất/thất bại và khôi phục job treo.
import { createHash } from 'node:crypto';
import { ingredientLookupRepository as jobs } from '../repositories/ingredientLookupRepository.js';
import { guestQuotaRepository } from '../repositories/guestQuotaRepository.js';
import { guestQuotaService } from './guestQuotaService.js';
import { assertAiConfigured } from './aiTransportService.js';
import { ApiError } from '../utils/apiError.js';
import { normalizeIngredientName, generatedIngredientSchema } from '../validators/ingredientLookupValidator.js';
import { INGREDIENT_LOOKUP_FAILURE_MESSAGE, INGREDIENT_LOOKUP_RELEASED } from '../constants/ingredientLookup.js';

// Băm SHA-256 để làm khóa sở hữu/khóa hoạt động mà không lưu trực tiếp ID người dùng hay khách.
const hash = (text) => createHash('sha256').update(text).digest('hex');
// Khóa chủ sở hữu: phân biệt người dùng và khách bằng tiền tố trước khi băm.
const ownerKey = ({ userId, guestId }) => hash(userId ? `user:${userId}` : `guest:${guestId}`);

// Trả về dinh dưỡng trên 100 g hoặc null.
function nutritionView({ calories_per_100g: calories, protein, fat, carbs }) {
  // Bộ số liệu thiếu sẽ gây hiểu nhầm, nên chỉ hiển thị khi có đủ cả hồ sơ dinh dưỡng trên 100 g.
  return [calories, protein, fat, carbs].some((value) => value === null || value === undefined)
    ? null : { calories, protein, fat, carbs };
}

// Chuyển nguyên liệu sang dạng trả về client; chỉ trả khi đã có phần chi tiết.
function ingredientView(row) {
  if (!row?.details) return null;
  const { ingredient_id: id, name, details } = row;
  return { id: String(id), name, category: details.category, origin: details.origin, plant: details.plant,
    description: details.description, cooking: details.cooking, aliases: details.aliases, image: details.image_url,
    nutritionPer100g: nutritionView(row) };
}

// Chuyển job sang dạng trả về client.
function jobView(job) {
  return { jobId: job.id, status: job.status, ingredient: ingredientView(job.ingredient),
    errorCode: job.errorCode, errorMessage: job.errorMessage };
}

// Giữ một lượt AI cho khách; người dùng đăng nhập không bị giới hạn nên không cần giữ lượt.
async function reserve(identity, db) {
  if (identity.userId) return undefined;
  const reservation = await guestQuotaService.reserveTurn({ guestId: identity.guestId }, db);
  // Lưu ngày dạng chuỗi ISO vì reservation được lưu thành JSON trên job.
  return { guestId: reservation.guestId, quotaDate: reservation.quotaDate.toISOString(),
    reservationRevision: reservation.reservationRevision };
}

// Hoàn lượt AI cho khách khi job thất bại.
async function refund(job, db) {
  if (job.reservation) await guestQuotaRepository.releaseTurn({ ...job.reservation,
    quotaDate: new Date(job.reservation.quotaDate) }, db);
}

// Dữ liệu cập nhật khi job thất bại: giải phóng lease/activeKey và dùng thông báo lỗi chung cho người dùng.
const failureData = (errorCode) => ({ status: 'FAILED', ...INGREDIENT_LOOKUP_RELEASED,
  completedAt: new Date(), errorCode, errorMessage: INGREDIENT_LOOKUP_FAILURE_MESSAGE });

export const ingredientLookupService = {
  // Tạo job tra cứu: nếu từ điển đã có nguyên liệu thì trả ngay (200), nếu cùng chủ sở hữu đang tra cứu tên này thì trả job đang chạy (202).
  create({ payload, identity }) {
    const ingredientName = normalizeIngredientName(payload.ingredientName);
    const key = ownerKey(identity);
    // activeKey = chủ sở hữu + tên viết thường, đảm bảo mỗi người chỉ có một job cho cùng một tên tại một thời điểm.
    const activeKey = hash(`${key}:${ingredientName.toLocaleLowerCase('vi')}`);
    return jobs.transaction(async (tx) => {
      // Khóa theo activeKey để hai request trùng đồng thời không tạo hai job và trừ hai lượt.
      await jobs.lockIngredient(activeKey, tx);
      const existing = await jobs.findIngredient(ingredientName, tx);
      if (existing?.details) return { status: 200, data: { jobId: null, status: 'COMPLETED',
        ingredient: ingredientView(existing), errorCode: null, errorMessage: null } };
      const active = await jobs.findActive(activeKey, tx);
      if (active) return { status: 202, data: jobView(active) };
      // Chỉ kiểm tra cấu hình AI khi thật sự cần gọi AI, để tra cứu nguyên liệu có sẵn vẫn hoạt động.
      assertAiConfigured();
      const reservation = await reserve(identity, tx);
      const job = await jobs.create({ ownerKey: key, activeKey, ingredientName, reservation,
        sourcePhoto: payload.photo ? Buffer.from(payload.photo.imageBase64, 'base64') : undefined,
        sourceMimeType: payload.photo?.mimeType }, tx);
      return { status: 202, data: jobView(job) };
    });
  },
  // Lấy trạng thái job của chính chủ sở hữu.
  async get({ id, identity }) {
    const job = await jobs.findOwned({ id, ownerKey: ownerKey(identity) });
    if (!job) throw ApiError.notFound('Không tìm thấy tác vụ tra cứu nguyên liệu.');
    return jobView(job);
  },
  // Hoàn tất job: validate kết quả AI, lưu vào từ điển và gắn nguyên liệu vào job trong cùng transaction.
  complete({ job, result }) {
    const ingredient = generatedIngredientSchema.parse(result);
    return jobs.transaction(async (tx) => {
      await jobs.updateLeased({ job, data: { status: 'COMPLETED', ...INGREDIENT_LOOKUP_RELEASED,
        completedAt: new Date(), errorCode: null, errorMessage: null } }, tx);
      const saved = await jobs.saveIngredient({ job, result: ingredient }, tx);
      return jobView(await jobs.attachIngredient({ id: job.id, ingredientId: saved.ingredient_id }, tx));
    });
  },
  // Đánh dấu job thất bại và hoàn lượt cho khách trong cùng transaction.
  fail({ job, errorCode }) {
    return jobs.transaction(async (tx) => {
      await jobs.updateLeased({ job, data: failureData(errorCode) }, tx);
      await refund(job, tx);
      return { status: 'FAILED', errorCode };
    });
  },
  // Khôi phục job hết hạn lease (worker chết giữa chừng): đánh dấu thất bại và hoàn lượt.
  async recoverExpired() {
    for (const job of await jobs.findExpired()) {
      await jobs.transaction(async (tx) => {
        const updated = await jobs.failExpired({ job, data: failureData('INGREDIENT_LOOKUP_INTERRUPTED') }, tx);
        // Chỉ hoàn lượt khi thật sự cập nhật được job, tránh hoàn hai lần nếu worker khác vừa xử lý.
        if (updated.count === 1) await refund(job, tx);
      });
    }
  },
};
