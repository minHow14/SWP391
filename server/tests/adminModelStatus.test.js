// D:/SWP391/SWP391/server/tests/adminModelStatus.test.js
import { afterEach, expect, it, vi } from 'vitest';
import { aiLogRepository } from '../src/repositories/aiLogRepository.js';
import { getAiModelsStatus } from '../src/services/admin.service.js';

afterEach(() => vi.restoreAllMocks());

it('does not report healthy or a success rate when no calls have been observed', async () => {
  vi.spyOn(aiLogRepository, 'findRecent').mockResolvedValue([]);
  const models = await getAiModelsStatus();
  expect(models.length).toBeGreaterThan(0);
  for (const model of models) {
    expect(model).toMatchObject({ status: 'UNKNOWN', successRate: null, totalCalls: 0, lastActive: null });
  }
});

it('calculates success rate from observed calls and keeps inactive models unknown', async () => {
  vi.spyOn(aiLogRepository, 'findRecent').mockResolvedValue([
    { action: 'CHAT_STREAM_USER', status: 'ERROR', createdAt: new Date('2026-10-30T00:00:00Z') },
    { action: 'CHAT_STREAM_USER', status: 'SUCCESS', createdAt: new Date('2026-10-29T00:00:00Z') },
  ]);
  const models = await getAiModelsStatus();
  expect(models.find((model) => model.id === 'chatbot')).toMatchObject({ totalCalls: 2, errorCalls: 1, successRate: 50 });
  expect(models.find((model) => model.id === 'moderation')).toMatchObject({ status: 'UNKNOWN', successRate: null });
});
