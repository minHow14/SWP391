// D:/SWP391/SWP391/server/tests/contentModerationImageFlow.test.js
// Kiểm thử đầu-cuối (cần DB test) kiểm duyệt ảnh: API → DB → worker → HTTP nội bộ tới AI giả,
// bao gồm ảnh đính kèm blog và ảnh thumbnail video, đối chiếu với hợp đồng OpenAPI.
import http from 'node:http';
import path from 'node:path';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
// Bật kiểm duyệt trước khi import app (vi.hoisted chạy trước mọi import).
vi.hoisted(() => { process.env.CONTENT_MODERATION_ENABLED = 'true'; });
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { POST_UPLOAD_DIRECTORY } from '../src/config/uploads.js';
import { generateToken } from '../src/utils/jwt.js';
import { createContentModerationAiService } from '../src/services/contentModerationAiService.js';
import { processContentModerationJob } from '../src/services/contentModerationProcessor.js';
import { runContentModerationWorker } from '../src/workers/contentModerationWorker.js';
import { moderationContract } from './helpers/openApiContract.js';

// Khóa nội bộ, đường dẫn endpoint duyệt văn bản/ảnh, cấu hình worker, ảnh PNG mẫu và các kết luận mẫu.
const INTERNAL_KEY = 'moderation-image-flow-key-32-characters';
const TEXT_PATH = '/api/v1/content-moderations';
const IMAGE_PATH = '/api/v1/image-moderations';
const config = { enabled: true, leaseMs: 60_000, maxAttempts: 2, retryMs: 1, pollMs: 1 };
const PNG_BYTES = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const textAllowed = { decision: 'ALLOW', reason: 'Món chay từ nấm.', categories: [], evidence: [],
  modelName: 'integration-test-provider', policyVersion: 'integration-test-policy' };
const imageAllowed = { decision: 'ALLOW', reason: 'Ảnh đĩa nấm xào.', categories: [], observations: [],
  modelName: 'integration-test-provider', policyVersion: 'integration-test-image-policy' };
const imageFlagged = { ...imageAllowed, decision: 'REVIEW', reason: 'Ảnh có đĩa thịt heo quay.',
  categories: ['ANIMAL_MEAT_PROMOTION'], observations: ['Đĩa thịt heo quay da giòn'] };
// Tên file ảnh ngẫu nhiên được ghi thật vào thư mục upload để loader đọc được.
const fileName = `moderation-flow-${randomUUID()}.png`;
const imageUrl = `/uploads/posts/${fileName}`;
// Biến trạng thái dùng chung và các hàm tiện ích gọi API với tư cách chủ bài.
let owner, ownerToken, endpoint, ai, verdicts, received;
const auth = () => ({ Authorization: `Bearer ${ownerToken}` });
const ownerJob = (id) => request(app).get(`/api/v1/content-moderation-jobs/${id}`).set(auth());
const createBlog = (attachments) => request(app).post('/api/v1/blogs').set(auth())
  .send({ title: 'Nấm xào sả ớt', content: 'Món chay từ nấm.', attachments });

// Xử lý request tới AI giả: ghi lại request, trả kết luận văn bản hoặc ảnh tùy endpoint
// và kiểm tra cả request lẫn response khớp hợp đồng OpenAPI.
async function respond(req, res) {
  let content = '';
  for await (const chunk of req) content += chunk;
  received.push({ path: req.url, key: req.headers['x-internal-api-key'], body: JSON.parse(content) });
  const isImage = req.url === IMAGE_PATH;
  const body = { success: true, message: 'Test verdict.', data: isImage ? verdicts.image : verdicts.text,
    meta: { requestId: req.headers['x-request-id'] } };
  moderationContract(isImage ? 'ImageModerationRequest' : 'ModerationRequest').parse(received.at(-1).body);
  moderationContract(isImage ? 'ImageModerationResponse' : 'ModerationResponse').parse(body);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

// Chạy worker thật đến khi job hoàn tất hoặc thất bại; watchdog 5 giây tránh test treo.
async function finishQueuedWork() {
  const controller = new AbortController();
  const watchdog = setTimeout(() => controller.abort(), 5_000);
  try {
    await runContentModerationWorker({ config, signal: controller.signal, log: { info() {}, error() {} },
      processJob: async (job, options) => {
        const result = await processContentModerationJob(job, { ...options, ai });
        if (['COMPLETED', 'FAILED'].includes(result.status)) controller.abort();
        return result;
      } });
  } finally { clearTimeout(watchdog); }
}

// Ghi file ảnh thật, tạo chủ bài và khởi động HTTP server giả làm AI Service.
beforeAll(async () => {
  await writeFile(path.join(POST_UPLOAD_DIRECTORY, fileName), PNG_BYTES);
  owner = await prisma.user.create({ data: { email: `moderation-image-flow-${randomUUID()}@example.invalid`,
    full_name: 'Moderation image flow test', password_hash: 'unused-test-hash', role: 2 } });
  ownerToken = generateToken({ user_id: owner.user_id });
  endpoint = http.createServer((req, res) => { respond(req, res).catch(() => { res.destroy(); }); });
  endpoint.listen(0, '127.0.0.1');
  await once(endpoint, 'listening');
  ai = createContentModerationAiService({ config: { url: `http://127.0.0.1:${endpoint.address().port}`, internalApiKey: INTERNAL_KEY }, timeoutMs: 1_000 });
});

// Đặt lại kết luận mặc định (đều ALLOW) và xóa bài của chủ trước mỗi test.
beforeEach(async () => {
  received = [];
  verdicts = { text: textAllowed, image: imageAllowed };
  await prisma.post.deleteMany({ where: { author_id: owner.user_id } });
});

// Xóa file ảnh, đóng server giả, dọn user và đóng DB.
afterAll(async () => {
  await rm(path.join(POST_UPLOAD_DIRECTORY, fileName), { force: true });
  if (endpoint) { endpoint.closeAllConnections(); await new Promise((resolve) => endpoint.close(resolve)); }
  await prisma.user.deleteMany({ where: { user_id: owner?.user_id ?? -1 } });
  await prisma.$disconnect();
});

// Nhóm test: kiểm duyệt ảnh qua API, DB, worker và HTTP nội bộ.
describe('image moderation through APIs, database, worker and internal HTTP', () => {
  // Văn bản vô hại nhưng ảnh upload bị gắn cờ thì bài vẫn bị ẩn; AI nhận đúng ảnh base64 kèm ngữ cảnh bài viết.
  it('hides a post whose text is harmless but whose uploaded image is flagged', async () => {
    verdicts.image = imageFlagged;
    const submitted = await createBlog([{ url: imageUrl, type: 'image', name: 'dish.png' }]);
    expect(submitted.status).toBe(202);
    const { jobId, blog } = submitted.body.data;
    await finishQueuedWork();
    const job = (await ownerJob(jobId)).body.data.job;
    moderationContract('ModerationJob').parse(job);
    expect(job).toMatchObject({ status: 'COMPLETED', applied: true, result: { decision: 'REVIEW',
      reason: `Ảnh 1: ${imageFlagged.reason}`, categories: ['ANIMAL_MEAT_PROMOTION'], evidence: [],
      imageFindings: [{ imageUrl, decision: 'REVIEW', reason: imageFlagged.reason, categories: ['ANIMAL_MEAT_PROMOTION'],
        observations: imageFlagged.observations, errorCode: null }] } });
    expect((await prisma.post.findUnique({ where: { post_id: blog.post_id } })).status).toBe('HIDDEN_BY_AI');
    expect(received.find((call) => call.path === IMAGE_PATH)).toEqual({ path: IMAGE_PATH, key: INTERNAL_KEY,
      body: { jobId, contentType: 'POST', contentVersion: 1, title: blog.title, content: blog.content,
        imageIndex: 0, mimeType: 'image/png', imageBase64: PNG_BYTES.toString('base64') } });
  });

  // Văn bản và mọi ảnh đều ALLOW thì bài được đăng; file video không bị gửi đi duyệt ảnh.
  it('publishes when the text and every image are allowed', async () => {
    const submitted = await createBlog([{ url: imageUrl, type: 'image' }, { url: '/uploads/posts/cooking.mp4', type: 'video' }]);
    await finishQueuedWork();
    const job = (await ownerJob(submitted.body.data.jobId)).body.data.job;
    expect(job.result).toMatchObject({ decision: 'ALLOW', imageFindings: [{ imageUrl, decision: 'ALLOW' }] });
    expect(received.filter((call) => call.path === IMAGE_PATH)).toHaveLength(1);
    expect((await request(app).get(`/api/v1/blogs/${submitted.body.data.blog.post_id}`)).status).toBe(200);
  });

  // Ảnh không đọc được được chuyển cho admin xem xét (REVIEW) mà không gọi mô hình duyệt ảnh.
  it('sends an unreadable image to an administrator without calling the image model', async () => {
    const missingUrl = `/uploads/posts/missing-${randomUUID()}.jpg`;
    const submitted = await createBlog([{ url: missingUrl, type: 'image' }]);
    await finishQueuedWork();
    const job = (await ownerJob(submitted.body.data.jobId)).body.data.job;
    moderationContract('ModerationJob').parse(job);
    expect(job.result).toMatchObject({ decision: 'REVIEW', categories: [],
      imageFindings: [{ imageUrl: missingUrl, decision: 'REVIEW', errorCode: 'MODERATION_IMAGE_UNREADABLE' }] });
    expect(received.map((call) => call.path)).toEqual([TEXT_PATH]);
  });

  // Sửa bài chỉ đổi ảnh vẫn phải kiểm duyệt lại; sửa mà giữ nguyên ảnh thì không tạo job mới.
  it('re-moderates an edit that only swaps images and skips an edit that keeps them', async () => {
    const submitted = await createBlog([]);
    await finishQueuedWork();
    const postId = submitted.body.data.blog.post_id;
    const swapped = await request(app).put(`/api/v1/blogs/${postId}`).set(auth()).send({ attachments: [{ url: imageUrl, type: 'image' }] });
    expect(swapped.status).toBe(202);
    moderationContract('BlogReceipt').parse(swapped.body.data);
    expect(swapped.body.data).toMatchObject({ moderationStatus: 'PENDING', blog: { moderationVersion: 2 } });
    const queued = await prisma.contentModerationJob.findFirst({ where: { postId, contentVersion: 2 } });
    expect(queued.imageUrls).toEqual([imageUrl]);
    await finishQueuedWork();
    const unchanged = await request(app).put(`/api/v1/blogs/${postId}`).set(auth()).send({ attachments: [{ url: imageUrl, type: 'image' }] });
    expect(unchanged.status).toBe(200);
    expect(unchanged.body.data.jobId).toBeUndefined();
    expect(await prisma.contentModerationJob.count({ where: { postId } })).toBe(2);
  });

  // Liên kết đính kèm bên ngoài và video không phải YouTube bị từ chối trước khi lưu.
  it('rejects outside attachment links and non-YouTube videos before saving', async () => {
    expect((await createBlog([{ url: 'https://example.com/meat.jpg', type: 'image' }])).status).toBe(400);
    const video = await request(app).post('/api/v1/videos').set(auth()).send({ title: 'Video', video_url: 'https://vimeo.com/123' });
    expect(video.status).toBe(400);
    expect(await prisma.post.count({ where: { author_id: owner.user_id } })).toBe(0);
  });

  // Thumbnail video upload được đưa vào hàng đợi kiểm duyệt và trả biên nhận job.
  it('queues an uploaded video thumbnail and returns the job receipt', async () => {
    const submitted = await request(app).post('/api/v1/videos').set(auth())
      .send({ title: 'Sườn non chay', video_url: 'https://youtu.be/3MySvzHeUyo', thumbnail_url: imageUrl });
    expect(submitted.status).toBe(202);
    moderationContract('VideoReceipt').parse(submitted.body.data);
    expect(submitted.body.data).toMatchObject({ moderationStatus: 'PENDING',
      video: { video_url: 'https://www.youtube.com/watch?v=3MySvzHeUyo' } });
    const queued = await prisma.contentModerationJob.findUnique({ where: { id: submitted.body.data.jobId } });
    expect(queued.imageUrls).toEqual([imageUrl]);
  });

  // Chỉ đổi thumbnail upload của video cũng phải kiểm duyệt lại; giữ nguyên thì không.
  it('re-moderates a video when only its uploaded thumbnail changes', async () => {
    const created = await request(app).post('/api/v1/videos').set(auth())
      .send({ title: 'Sườn non chay', video_url: 'https://www.youtube.com/watch?v=3MySvzHeUyo' });
    await finishQueuedWork();
    const url = `/api/v1/videos/${created.body.data.video.post_id}`;
    const changed = await request(app).put(url).set(auth()).send({ thumbnail_url: imageUrl });
    expect(changed.status).toBe(202);
    moderationContract('VideoReceipt').parse(changed.body.data);
    await finishQueuedWork();
    const unchanged = await request(app).put(url).set(auth()).send({ thumbnail_url: imageUrl });
    expect(unchanged.status).toBe(200);
    expect(unchanged.body.data.jobId).toBeUndefined();
    moderationContract('VideoUpdate').parse({ thumbnail_url: imageUrl });
  });
});
