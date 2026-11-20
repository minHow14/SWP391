// D:/SWP391/SWP391/server/tests/adminHealth.test.js
// Kiểm thử service tổng hợp tình trạng hệ thống (DB và AI Service) cho trang admin.
import { afterEach, expect, it, vi } from 'vitest';
import { getSystemHealth } from '../src/services/adminHealthService.js';
import { healthRepository } from '../src/repositories/healthRepository.js';

// Khôi phục mock và fetch toàn cục sau mỗi test.
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// Chỉ báo HEALTHY và UP khi cả DB lẫn AI Service phản hồi thành công; checkedAt phải là ngày hợp lệ.
it('reports database and AI HTTP connectivity only after successful probes', async () => {
  vi.spyOn(healthRepository, 'checkDatabase').mockResolvedValue();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { status: 'ok' } }) }));
  const result = await getSystemHealth();
  expect(result.status).toBe('HEALTHY');
  expect(result.services.map((service) => service.status)).toEqual(['UP', 'UP']);
  expect(Number.isNaN(Date.parse(result.checkedAt))).toBe(false);
});

// Khi probe lỗi phải báo DEGRADED/DOWN và không được lộ chi tiết lỗi nội bộ (chuỗi kết nối, lỗi upstream).
it('reports failed probes without exposing database errors or claiming the service is online', async () => {
  vi.spyOn(healthRepository, 'checkDatabase').mockRejectedValue(new Error('private connection details'));
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private upstream details')));
  const result = await getSystemHealth();
  expect(result.status).toBe('DEGRADED');
  expect(result.services.map((service) => service.status)).toEqual(['DOWN', 'DOWN']);
  expect(JSON.stringify(result)).not.toContain('private');
});

// HTTP 200 nhưng body không đúng hợp đồng health của AI vẫn phải bị coi là DOWN.
it('rejects an HTTP 200 response that is not the AI health contract', async () => {
  vi.spyOn(healthRepository, 'checkDatabase').mockResolvedValue();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) }));
  expect((await getSystemHealth()).services[1].status).toBe('DOWN');
});
