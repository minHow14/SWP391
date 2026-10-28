// server/tests/foodScanner.test.js
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { generateToken } from '../src/utils/jwt.js';
import { ROLES } from '../src/constants/roles.js';
import { createGuestSession } from './helpers/guestSession.js';

const DUMMY_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

let guestSession;
let guestId;
const guestIds = [];
const userToken = generateToken({ user_id: 2, role: ROLES.USER });

beforeEach(async () => {
  guestSession = await createGuestSession(app);
  guestId = guestSession.guestId;
  guestIds.push(guestId);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

afterAll(async () => {
  if (guestIds.length > 0) {
    await prisma.guestQuota.deleteMany({ where: { guestId: { in: guestIds } } });
  }
  await prisma.aiGeneration.deleteMany({ where: { type: 'FOOD_SCAN' } });
  await prisma.aiLog.deleteMany({ where: { action: { startsWith: 'FOOD_SCAN' } } });
  await prisma.$disconnect();
});

describe('POST /api/ai/food-scanner/analyze - Food Scanner Gateway API', () => {
  it('rejects invalid payload when imageBase64 is missing', async () => {
    const res = await guestSession.agent
      .post('/api/ai/food-scanner/analyze')
      .send({ dietTypeId: 1 });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('INVALID_INPUT');
  });

  it('rejects request with invalid dietTypeId', async () => {
    const res = await guestSession.agent
      .post('/api/ai/food-scanner/analyze')
      .send({ imageBase64: DUMMY_BASE64, dietTypeId: -1 });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('INVALID_INPUT');
  });

  it('successfully analyzes food image for guest, consumes quota and creates audit log', async () => {
    const mockAiResponse = {
      success: true,
      message: 'Phân tích hình ảnh thực phẩm thành công.',
      data: {
        dishName: 'Đậu hũ sốt cà chua',
        detectedScanType: 'DISH',
        status: 'clear',
        summary: 'Món ăn phù hợp với chế độ thuần chay.',
        findings: [],
        identifiedIngredients: ['Đậu hũ', 'Cà chua'],
        restaurantChecklist: [],
        swapSuggestions: [],
        nutritionEstimate: { calories: 180, protein: 9, carbs: 12, fat: 5 },
      },
      meta: { modelName: 'test-vision-model' },
    };

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(mockAiResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));

    const res = await guestSession.agent
      .post('/api/ai/food-scanner/analyze')
      .send({
        imageBase64: DUMMY_BASE64,
        dietTypeId: 1,
        scanType: 'DISH',
        dishName: 'Đậu hũ sốt cà',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dishName).toBe('Đậu hũ sốt cà chua');
    expect(res.body.meta.remaining).toBe(2);

    const quota = await prisma.guestQuota.findFirst({ where: { guestId } });
    expect(quota.usedCount).toBe(1);

    const log = await prisma.aiLog.findFirst({
      where: { action: 'FOOD_SCAN_GUEST' },
      orderBy: { logId: 'desc' },
    });
    expect(log.status).toBe('SUCCESS');
  });

  it('records ai_generations for authenticated user', async () => {
    const mockAiResponse = {
      success: true,
      message: 'Phân tích thành công.',
      data: {
        dishName: 'Bún bò Huế chay',
        detectedScanType: 'DISH',
        status: 'clear',
        summary: 'Phù hợp thuần chay.',
        findings: [],
        identifiedIngredients: ['Nấm', 'Đậu hũ'],
        restaurantChecklist: [],
        swapSuggestions: [],
        nutritionEstimate: { calories: 350, protein: 12, carbs: 55, fat: 8 },
      },
      meta: { modelName: 'test-vision-model' },
    };

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(mockAiResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));

    const res = await request(app)
      .post('/api/ai/food-scanner/analyze')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        imageBase64: DUMMY_BASE64,
        dietTypeId: 1,
        scanType: 'DISH',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta.generationId).toBeDefined();

    const generation = await prisma.aiGeneration.findUnique({
      where: { id: res.body.meta.generationId },
    });
    expect(generation).toBeDefined();
    expect(generation.type).toBe('FOOD_SCAN');
    expect(generation.status).toBe('COMPLETED');
  });

  it('refunds guest quota and marks FAILED when upstream AI fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      success: false,
      message: 'Lỗi nội bộ AI service',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })));

    const res = await guestSession.agent
      .post('/api/ai/food-scanner/analyze')
      .send({
        imageBase64: DUMMY_BASE64,
        dietTypeId: 1,
      });

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);

    // Kiểm tra quota khách được hoàn lại
    const quota = await prisma.guestQuota.findFirst({ where: { guestId } });
    expect(quota.usedCount).toBe(0);
  });
});
