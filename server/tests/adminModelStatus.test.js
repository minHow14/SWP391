// D:/SWP391/SWP391/server/tests/adminModelStatus.test.js
// Kiểm thử thống kê trạng thái các mô hình AI trên trang admin dựa vào log gọi AI.
import { afterEach, expect, it, vi } from 'vitest';
import { aiLogRepository } from '../src/repositories/aiLogRepository.js';
import { getAiModelsStatus } from '../src/services/admin.service.js';

// Khôi phục spy repository sau mỗi test.
afterEach(() => vi.restoreAllMocks());

// Chưa có lượt gọi nào thì không được báo HEALTHY hay tỷ lệ thành công giả — phải là UNKNOWN với số liệu rỗng.
it('does not report healthy or a success rate when no calls have been observed', async () => {
  vi.spyOn(aiLogRepository, 'findRecent').mockResolvedValue([]);
  const models = await getAiModelsStatus();
  expect(models.length).toBeGreaterThan(0);
  for (const model of models) {
    expect(model).toMatchObject({ status: 'UNKNOWN', successRate: null, totalCalls: 0, lastActive: null });
  }
});

// Tỷ lệ thành công tính từ lượt gọi thực tế; mô hình không có lượt gọi vẫn giữ UNKNOWN.
it('calculates success rate from observed calls and keeps inactive models unknown', async () => {
  vi.spyOn(aiLogRepository, 'findRecent').mockResolvedValue([
    { action: 'CHAT_STREAM_USER', status: 'ERROR', createdAt: new Date('2026-10-30T00:00:00Z') },
    { action: 'CHAT_STREAM_USER', status: 'SUCCESS', createdAt: new Date('2026-10-29T00:00:00Z') },
  ]);
  const models = await getAiModelsStatus();
  expect(models.find((model) => model.id === 'chatbot')).toMatchObject({ totalCalls: 2, errorCalls: 1, successRate: 50 });
  expect(models.find((model) => model.id === 'moderation')).toMatchObject({ status: 'UNKNOWN', successRate: null });
  expect(models.find((model) => model.id === 'recommendation')).toMatchObject({ status: 'UNKNOWN', successRate: null });
});

// Các action meal planner, tính dinh dưỡng và gợi ý (kể cả gợi ý gần đây) phải được quy về mô hình recommendation.
it('correctly attributes meal planner, nutrition and recommendation actions to recommendation engine', async () => {
  vi.spyOn(aiLogRepository, 'findRecent').mockResolvedValue([
    { action: 'MEAL_PLANNER_USER_10', status: 'SUCCESS', createdAt: new Date('2026-10-30T00:00:00Z') },
    { action: 'NUTRITION_CALCULATE', status: 'SUCCESS', createdAt: new Date('2026-10-29T00:00:00Z') },
    { action: 'RECOMMENDATION', status: 'SUCCESS', createdAt: new Date('2026-10-28T00:00:00Z') },
    { action: 'RECOMMENDATION_NEARBY', status: 'ERROR', createdAt: new Date('2026-10-27T00:00:00Z') },
  ]);
  const models = await getAiModelsStatus();
  const recModel = models.find((model) => model.id === 'recommendation');
  expect(recModel).toMatchObject({
    status: 'HEALTHY',
    totalCalls: 4,
    errorCalls: 1,
    successRate: 75,
  });
});
