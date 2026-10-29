// D:/SWP391/SWP391/client/test/foodScannerService.test.jsx
import { expect, it, vi } from 'vitest';
import apiClient from '../src/services/apiClient.js';
import { analyzeFoodImage } from '../src/services/foodScannerService.js';

vi.mock('../src/services/apiClient.js', () => ({ default: { post: vi.fn().mockResolvedValue({ success: true }) } }));
it('allows the gateway its full processing budget and preserves caller cancellation', async () => {
  const controller = new AbortController();
  await analyzeFoodImage({ imageBase64: 'YWJj', dietTypeId: 1 }, controller.signal);
  const config = apiClient.post.mock.calls[0][2];
  expect(config.signal).toBe(controller.signal);
  expect(config.timeout).toBeGreaterThan(180_000);
  expect(config.timeout).toBeLessThanOrEqual(200_000);
});
