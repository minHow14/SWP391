// D:/SWP391/SWP391/server/tests/ingredientLookup.test.js
// Kiểm thử tích hợp (cần DB test) tra cứu nguyên liệu bằng AI theo job: hàng đợi, quyền xem, chống trùng,
// hạn mức khách, lưu vào từ điển công khai, dinh dưỡng trên 100 g và bổ sung dinh dưỡng cho dữ liệu cũ.
import './loadTestEnvironment.js';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { ingredientLookupRepository as jobs } from '../src/repositories/ingredientLookupRepository.js';
import { ingredientLookupService as lookup } from '../src/services/ingredientLookupService.js';
import { processIngredientLookupJob } from '../src/services/ingredientLookupProcessor.js';
import { runIngredientLookupWorker } from '../src/workers/ingredientLookupWorker.js';
import { backfillIngredientNutrition } from '../src/services/ingredientNutritionBackfill.js';
import { isEnergyConsistent } from '../src/validators/ingredientLookupValidator.js';

// Chủ job, token, danh sách tên nguyên liệu cần dọn, agent khách giữ cookie và dữ liệu AI mẫu; `png` là ảnh 1x1 hợp lệ.
let owner, token;
const names = [];
const actor = request.agent(app);
const submit = (payload) => actor.post('/api/v1/ingredient-lookup-jobs').send(payload);
const information = { category: 'vegetable', origin: 'Thực vật', plant: true,
  description: 'Mô tả từ nhà cung cấp AI trong kiểm thử.', cooking: 'Gợi ý nấu từ nhà cung cấp AI trong kiểm thử.', aliases: '' };
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY9sAAAAASUVORK5CYII=';

// Xóa job, nguyên liệu và hạn mức khách sinh ra từ các tên đã dùng trong test.
async function cleanupLookups() {
  const records = await prisma.ingredientLookupJob.findMany({ where: { ingredientName: { in: names, mode: 'insensitive' } }, select: { reservation: true } });
  const guestIds = records.map((job) => job.reservation?.guestId).filter(Boolean);
  await prisma.ingredientLookupJob.deleteMany({ where: { ingredientName: { in: names, mode: 'insensitive' } } });
  await prisma.ingredient.deleteMany({ where: { name: { in: names, mode: 'insensitive' } } });
  await prisma.guestQuota.deleteMany({ where: { guestId: { in: guestIds } } });
}

// Gửi một yêu cầu tra cứu với tên ngẫu nhiên (kèm ảnh nếu có) và trả về dữ liệu job 202.
// @param photo ảnh tùy chọn { imageBase64, mimeType }
async function queue(photo) {
  const ingredientName = `Nguyên liệu kiểm thử ${randomUUID()}`;
  names.push(ingredientName);
  const response = await submit({ ingredientName, ...(photo && { photo }) });
  expect(response.status).toBe(202);
  return { ingredientName, ...response.body.data };
}

// Giả lập AI Service trả dữ liệu nguyên liệu cho trước.
// @param data dữ liệu AI trả về
// @returns mock fetch để kiểm tra request đã gửi
function provider(data = { isIngredient: true, ingredient: information }) {
  const fetch = vi.fn(async () => new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' },
  }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

// Tạo user test và khởi tạo phiên khách cho agent.
beforeAll(async () => {
  owner = await prisma.user.create({ data: { email: `lookup-${randomUUID()}@example.invalid`,
    full_name: 'Ingredient lookup test', password_hash: 'unused-test-hash' } });
  token = generateToken({ user_id: owner.user_id });
  await actor.get('/api/v1/ai/usage');
});
// Dọn dữ liệu trước mỗi test, khôi phục mock sau mỗi test; dọn hết và đóng DB khi xong.
beforeEach(cleanupLookups);
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
afterAll(async () => {
  await cleanupLookups();
  await prisma.user.deleteMany({ where: { user_id: owner?.user_id ?? -1 } });
  await prisma.$disconnect();
});

// Nhóm test: job tra cứu nguyên liệu.
describe('ingredient lookup jobs', () => {
  // Trả job PENDING đã lưu DB (để FE poll) thay vì lọc từ điển cục bộ rỗng.
  it('returns a persisted pending job rather than filtering an empty local dictionary', async () => {
    const ingredientName = `Nguyên liệu kiểm thử ${randomUUID()}`;
    names.push(ingredientName);
    const response = await submit({ ingredientName });
    expect(response.status).toBe(202);
    expect(response.body.data).toMatchObject({ jobId: expect.any(String), status: 'PENDING', ingredient: null });
    const poll = await actor.get(`/api/v1/ingredient-lookup-jobs/${response.body.data.jobId}`);
    expect(poll.status).toBe(200);
    expect(poll.body.data).toMatchObject(response.body.data);
  });

  // Tên rỗng bị từ chối ngay ở ranh giới request.
  it('rejects empty names at the request boundary', async () => {
    expect((await submit({ ingredientName: '  ' })).status).toBe(400);
  });

  // Giới hạn độ dài tên áp dụng sau khi chuẩn hóa Unicode (một ký tự có thể nở thành nhiều ký tự).
  it('enforces the database name limit after Unicode normalization expands input', async () => {
    expect((await submit({ ingredientName: '\ufdfa'.repeat(12) })).status).toBe(400);
  });

  // Chỉ người dùng/phiên khách đã tạo job mới poll được; dữ liệu trả về không lộ trường nội bộ.
  it('limits polling to the signed-in user or signed guest session that created the job', async () => {
    const job = await queue();
    const url = `/api/v1/ingredient-lookup-jobs/${job.jobId}`;
    expect((await request(app).get(url).set('Authorization', `Bearer ${token}`)).status).toBe(404);
    expect((await request(app).get(url)).status).toBe(404);
    const visible = await actor.get(url);
    expect(visible.status).toBe(200);
    for (const field of ['ownerKey', 'reservation', 'sourcePhoto', 'leaseToken']) expect(visible.body.data).not.toHaveProperty(field);
  });

  // Gửi đồng thời cùng tên (khác hoa thường/khoảng trắng) chỉ tạo một job và chỉ trừ một lượt khách.
  it('deduplicates simultaneous submissions by normalized name without reserving extra guest quota', async () => {
    const ingredientName = `Nguyên liệu kiểm thử ${randomUUID()}`;
    names.push(ingredientName);
    const [first, second] = await Promise.all([
      submit({ ingredientName }), submit({ ingredientName: `  ${ingredientName.toLocaleUpperCase('vi')}  ` }),
    ]);
    expect(first.status).toBe(202);
    expect(second.body.data.jobId).toBe(first.body.data.jobId);
    const row = await prisma.ingredientLookupJob.findUnique({ where: { id: first.body.data.jobId } });
    const quota = await prisma.guestQuota.findFirst({ where: { guestId: row.reservation.guestId } });
    expect(quota.usedCount).toBe(1);
  });

  // Lưu byte ảnh thật và thông tin AI vào từ điển công khai; xóa ảnh nguồn và lease khỏi job sau khi xong.
  it('persists real photo bytes and generated details into the existing public dictionary', async () => {
    const job = await queue({ imageBase64: png, mimeType: 'image/png' });
    const fetch = provider();
    const claimed = await jobs.claim(60_000);
    expect(claimed.id).toBe(job.jobId);
    expect((await processIngredientLookupJob(claimed)).status).toBe('COMPLETED');
    const [url, options] = fetch.mock.calls[0];
    expect(url.endsWith('/api/ingredient-lookups')).toBe(true);
    expect(Boolean(options.headers['X-Internal-Api-Key'])).toBe(true);
    expect(JSON.parse(options.body)).toEqual({ ingredientName: job.ingredientName });
    const poll = await actor.get(`/api/v1/ingredient-lookup-jobs/${job.jobId}`);
    expect(poll.body.data.ingredient).toMatchObject({ name: job.ingredientName, ...information });
    const catalog = await request(app).get('/api/workspace/catalog');
    expect(catalog.body.data.ingredients.find((item) => item.name === job.ingredientName)).toMatchObject(information);
    const image = await request(app).get(poll.body.data.ingredient.image);
    expect(image.body).toEqual(Buffer.from(png, 'base64'));
    const record = await prisma.ingredient.findUnique({ where: { name: job.ingredientName } });
    expect(record).toMatchObject({ protein: null, fat: null, carbs: null, calories_per_100g: null });
    expect(await prisma.ingredientLookupJob.findUnique({ where: { id: job.jobId } })).toMatchObject({ sourcePhoto: null, leaseToken: null });
  });

  // Nguyên liệu đã có trong từ điển được trả ngay, không tạo job mới và không tốn lượt AI.
  it('returns the saved ingredient without a second job or AI quota charge', async () => {
    const job = await queue();
    provider();
    await processIngredientLookupJob(await jobs.claim(60_000));
    const response = await submit({ ingredientName: job.ingredientName });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ status: 'COMPLETED', jobId: null, ingredient: { name: job.ingredientName } });
    expect(await prisma.ingredientLookupJob.count({ where: { ingredientName: job.ingredientName } })).toBe(1);
  });

  // Kết quả AI sai định dạng hoặc không phải nguyên liệu: không tạo bản ghi từ điển và hoàn lượt khách đúng một lần.
  it.each([
    ['malformed output', { isIngredient: true, ingredient: { ...information, plant: 'yes' } }, 'INGREDIENT_LOOKUP_INVALID_OUTPUT'],
    ['a noningredient', { isIngredient: false, ingredient: null }, 'INGREDIENT_NOT_RECOGNIZED'],
  ])('rejects %s without creating catalog rows and refunds the guest once', async (_label, data, errorCode) => {
    const job = await queue();
    provider(data);
    const claimed = await jobs.claim(60_000);
    expect(await processIngredientLookupJob(claimed)).toMatchObject({ status: 'FAILED', errorCode });
    expect(await prisma.ingredient.count({ where: { name: job.ingredientName } })).toBe(0);
    const quota = await prisma.guestQuota.findFirst({ where: { guestId: claimed.reservation.guestId } });
    expect(quota.usedCount).toBe(0);
    await expect(lookup.fail({ job: claimed, errorCode })).rejects.toHaveProperty('errorCode', 'INGREDIENT_LOOKUP_LEASE_LOST');
    expect((await prisma.guestQuota.findFirst({ where: { guestId: claimed.reservation.guestId } })).usedCount).toBe(0);
  });

  // Job hết lease bị đánh dấu thất bại, hoàn lượt và chặn worker cũ ghi kết quả muộn.
  it('fails expired work, refunds its reservation and fences stale writes', async () => {
    const job = await queue();
    const claimed = await jobs.claim(60_000);
    await prisma.ingredientLookupJob.update({ where: { id: claimed.id }, data: { leaseExpiresAt: new Date(0) } });
    await lookup.recoverExpired();
    await lookup.recoverExpired();
    await expect(lookup.complete({ job: claimed, result: information })).rejects.toHaveProperty('errorCode', 'INGREDIENT_LOOKUP_LEASE_LOST');
    const poll = await actor.get(`/api/v1/ingredient-lookup-jobs/${job.jobId}`);
    expect(poll.body.data).toMatchObject({ status: 'FAILED', errorCode: 'INGREDIENT_LOOKUP_INTERRUPTED' });
    expect(await prisma.ingredient.count({ where: { name: job.ingredientName } })).toBe(0);
    expect((await prisma.guestQuota.findFirst({ where: { guestId: claimed.reservation.guestId } })).usedCount).toBe(0);
  });

  // Hai job đồng thời của hai chủ khác nhau chỉ tạo một mục từ điển và giữ chi tiết lưu đầu tiên.
  it('creates one dictionary entry for concurrent jobs from different owners and preserves the first saved details', async () => {
    const job = await queue();
    const second = await request(app).post('/api/v1/ingredient-lookup-jobs')
      .set('Authorization', `Bearer ${token}`).send({ ingredientName: job.ingredientName });
    expect(second.status).toBe(202);
    const claims = await Promise.all([jobs.claim(60_000), jobs.claim(60_000)]);
    expect(new Set(claims.map((item) => item.id)).size).toBe(2);
    const results = await Promise.all(claims.map((claimed) => lookup.complete({ job: claimed, result: information })));
    expect(results[0].ingredient.id).toBe(results[1].ingredient.id);
    expect(await prisma.ingredient.count({ where: { name: job.ingredientName } })).toBe(1);
    expect(await prisma.ingredientDetails.count({ where: { ingredient_id: Number(results[0].ingredient.id) } })).toBe(1);
  });

  // Ảnh có MIME khai báo không khớp byte thật bị từ chối.
  it('rejects images whose claimed type does not match their bytes', async () => {
    const response = await submit({ ingredientName: 'Tên nguyên liệu', photo: { imageBase64: png, mimeType: 'image/jpeg' } });
    expect(response.status).toBe(400);
  });

  // Liên kết job hoàn tất thất bại thì rollback mục từ điển và hoàn lượt.
  it('rolls back dictionary writes when linking the completed job fails', async () => {
    const job = await queue();
    provider();
    const claimed = await jobs.claim(60_000);
    vi.spyOn(jobs, 'attachIngredient').mockRejectedValueOnce(new Error('Storage failure'));
    expect((await processIngredientLookupJob(claimed)).status).toBe('FAILED');
    expect(await prisma.ingredient.count({ where: { name: job.ingredientName } })).toBe(0);
    expect((await prisma.guestQuota.findFirst({ where: { guestId: claimed.reservation.guestId } })).usedCount).toBe(0);
  });

  // Worker cục bộ xử lý job đang chờ và dừng khi nhận tín hiệu tắt.
  it('runs pending work through the local worker and stops on shutdown', async () => {
    const job = await queue();
    provider();
    const controller = new AbortController();
    const processJob = async (claimed, options) => {
      const result = await processIngredientLookupJob(claimed, options);
      controller.abort();
      return result;
    };
    await runIngredientLookupWorker({ signal: controller.signal, processJob });
    expect((await actor.get(`/api/v1/ingredient-lookup-jobs/${job.jobId}`)).body.data.status).toBe('COMPLETED');
  });
});

// Nhóm test: dinh dưỡng trên 100 g do AI cung cấp.
describe('AI nutrition per 100 g', () => {
  const nutrition = { calories: 20, protein: 1.5, fat: 0.2, carbs: 3.1 };
  const withNutrition = (value) => ({ isIngredient: true, ingredient: { ...information, nutritionPer100g: value } });
  const columns = (row) => ({ calories: row.calories_per_100g, protein: row.protein, fat: row.fat, carbs: row.carbs });

  // Dinh dưỡng trên 100 g được lưu để từ điển và kết quả tra cứu hiển thị.
  it('saves generated per-100 g nutrition so the dictionary and lookup show it', async () => {
    const job = await queue();
    provider(withNutrition(nutrition));
    expect((await processIngredientLookupJob(await jobs.claim(60_000))).status).toBe('COMPLETED');
    expect(columns(await prisma.ingredient.findUnique({ where: { name: job.ingredientName } }))).toEqual(nutrition);
    const poll = await actor.get(`/api/v1/ingredient-lookup-jobs/${job.jobId}`);
    expect(poll.body.data.ingredient.nutritionPer100g).toEqual(nutrition);
    const catalog = await request(app).get('/api/workspace/catalog');
    expect(catalog.body.data.ingredients.find((item) => item.name === job.ingredientName))
      .toMatchObject({ calories_per_100g: 20, protein: 1.5, fat: 0.2, carbs: 3.1 });
  });

  // Nhà cung cấp không có ước tính thì để trống dinh dưỡng mà tra cứu vẫn thành công.
  it('keeps nutrition empty and the lookup successful when the provider has no estimate', async () => {
    const job = await queue();
    provider(withNutrition(null));
    expect((await processIngredientLookupJob(await jobs.claim(60_000))).status).toBe('COMPLETED');
    const poll = await actor.get(`/api/v1/ingredient-lookup-jobs/${job.jobId}`);
    expect(poll.body.data.ingredient.nutritionPer100g).toBeNull();
  });

  // Chỉ điền cột còn trống của mục đã có, không ghi đè số liệu đã ghi nhận.
  it('fills only empty columns of an existing entry without overwriting recorded figures', async () => {
    const job = await queue();
    await prisma.ingredient.create({ data: { name: job.ingredientName, calories_per_100g: 76, protein: null, fat: 4.8, carbs: null } });
    provider(withNutrition(nutrition));
    expect((await processIngredientLookupJob(await jobs.claim(60_000))).status).toBe('COMPLETED');
    expect(columns(await prisma.ingredient.findUnique({ where: { name: job.ingredientName } })))
      .toEqual({ calories: 76, protein: 1.5, fat: 4.8, carbs: 3.1 });
  });

  // Dinh dưỡng phi lý (năng lượng mâu thuẫn, vượt 100 g, số âm, vượt năng lượng của chất béo thuần, thừa trường)
  // bị từ chối và không tạo mục từ điển.
  it.each([
    ['energy that contradicts the macronutrients', { calories: 400, protein: 1, fat: 0.1, carbs: 2 }],
    ['macronutrients above 100 g', { calories: 450, protein: 60, fat: 10, carbs: 40 }],
    ['negative grams', { ...nutrition, fat: -1 }],
    ['calories above pure fat', { calories: 950, protein: 0, fat: 100, carbs: 0 }],
    ['extra fields', { ...nutrition, fiber: 2 }],
  ])('rejects %s without creating a dictionary entry', async (_label, value) => {
    const job = await queue();
    provider(withNutrition(value));
    expect(await processIngredientLookupJob(await jobs.claim(60_000)))
      .toMatchObject({ status: 'FAILED', errorCode: 'INGREDIENT_LOOKUP_INVALID_OUTPUT' });
    expect(await prisma.ingredient.count({ where: { name: job.ingredientName } })).toBe(0);
  });

  // Chấp nhận số liệu thực tế mà chất xơ làm năng lượng lệch so với công thức Atwater.
  it('accepts real-world profiles where fibre makes energy differ from the Atwater estimate', () => {
    expect(isEnergyConsistent({ calories: 579, protein: 21.2, fat: 49.9, carbs: 21.6 })).toBe(true);
    expect(isEnergyConsistent({ calories: 76, protein: 8.1, fat: 4.8, carbs: 1.9 })).toBe(true);
    expect(isEnergyConsistent({ calories: 0, protein: 0, fat: 0, carbs: 0 })).toBe(true);
  });
});

// Nhóm test: bổ sung dinh dưỡng cho các mục AI tạo trước đây.
describe('backfilling nutrition for earlier AI entries', () => {
  const estimate = { calories: 16, protein: 1.3, fat: 0.2, carbs: 3 };
  let repository;

  // Tạo mục nguyên liệu có chi tiết, mặc định thiếu dinh dưỡng.
  // @param name tên nguyên liệu
  // @param data cột dinh dưỡng ghi đè
  async function entry(name, data = {}) {
    names.push(name);
    return prisma.ingredient.create({ data: { name, calories_per_100g: null, protein: null, fat: null, carbs: null, ...data,
      details: { create: { category: 'vegetable', origin: 'Thực vật', plant: true, description: 'Mô tả', cooking: 'Cách nấu', aliases: '' } } } });
  }

  beforeEach(() => {
    // Giới hạn phạm vi quét vào các bản ghi của bộ test này; DB test dùng chung có thể chứa mục khác.
    repository = { ...jobs, findMissingNutrition: async () => (await jobs.findMissingNutrition()).filter((row) => names.includes(row.name)) };
  });

  // Chế độ xem trước không ghi DB; chạy thật chỉ điền cột trống và tiếp tục khi một mục lỗi;
  // chạy lại chỉ còn các mục chưa có ước tính hoặc lỗi.
  it('previews without writing, then fills only empty columns and keeps going after a failure', async () => {
    const empty = await entry(`Rau bổ sung ${randomUUID()}`);
    const partial = await entry(`Rau một phần ${randomUUID()}`, { calories_per_100g: 15 });
    const unknown = await entry(`Rau lạ ${randomUUID()}`);
    const broken = await entry(`Rau lỗi ${randomUUID()}`);
    const generate = vi.fn(async ({ job }) => {
      if (job.ingredientName === broken.name) throw Object.assign(new Error('down'), { errorCode: 'AI_UNAVAILABLE' });
      return { ...information, nutritionPer100g: job.ingredientName === unknown.name ? null : estimate };
    });
    const preview = await backfillIngredientNutrition({ dryRun: true, generate, repository });
    expect(preview.find((row) => row.name === empty.name)).toMatchObject({ status: 'PREVIEW', nutrition: estimate });
    expect((await prisma.ingredient.findUnique({ where: { ingredient_id: empty.ingredient_id } })).calories_per_100g).toBeNull();

    const report = await backfillIngredientNutrition({ generate, repository });
    const status = Object.fromEntries(report.map((row) => [row.name, row.status]));
    expect(status).toEqual({ [empty.name]: 'UPDATED', [partial.name]: 'UPDATED', [unknown.name]: 'NO_ESTIMATE', [broken.name]: 'FAILED' });
    expect(report.find((row) => row.name === broken.name).errorCode).toBe('AI_UNAVAILABLE');
    expect(await prisma.ingredient.findUnique({ where: { ingredient_id: partial.ingredient_id } }))
      .toMatchObject({ calories_per_100g: 15, protein: 1.3, fat: 0.2, carbs: 3 });
    expect(await prisma.ingredient.findUnique({ where: { ingredient_id: empty.ingredient_id } }))
      .toMatchObject({ calories_per_100g: 16, protein: 1.3, fat: 0.2, carbs: 3 });
    expect((await backfillIngredientNutrition({ generate, repository })).map((row) => row.name).sort())
      .toEqual([broken.name, unknown.name].sort());
  });
});
