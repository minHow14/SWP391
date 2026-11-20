// D:/SWP391/SWP391/client/test/foodScannerService.test.jsx
// Kiểm thử cấu hình request của analyzeFoodImage: thời gian chờ đủ dài cho gateway và giữ AbortSignal của nơi gọi.
import { expect, it, vi } from 'vitest';
import apiClient from '../src/services/apiClient.js';
import { analyzeFoodImage } from '../src/services/foodScannerService.js';

// Mock apiClient.post để bắt cấu hình request thay vì gọi server thật.
vi.mock('../src/services/apiClient.js', () => ({ default: { post: vi.fn().mockResolvedValue({ success: true }) } }));
// Timeout phải lớn hơn thời gian xử lý tối đa của gateway (khoảng 180 giây) nhưng không quá 200 giây, và giữ tín hiệu hủy của nơi gọi.
it('allows the gateway its full processing budget and preserves caller cancellation', async () => {
  const controller = new AbortController();
  await analyzeFoodImage({ imageBase64: 'YWJj', dietTypeId: 1 }, controller.signal);
  const config = apiClient.post.mock.calls[0][2];
  expect(config.signal).toBe(controller.signal);
  expect(config.timeout).toBeGreaterThan(180_000);
  expect(config.timeout).toBeLessThanOrEqual(200_000);
});
