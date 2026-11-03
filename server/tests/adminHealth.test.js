// D:/SWP391/SWP391/server/tests/adminHealth.test.js
import { afterEach, expect, it, vi } from 'vitest';
import { getSystemHealth } from '../src/services/adminHealthService.js';
import { healthRepository } from '../src/repositories/healthRepository.js';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('reports database and AI HTTP connectivity only after successful probes', async () => {
  vi.spyOn(healthRepository, 'checkDatabase').mockResolvedValue();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { status: 'ok' } }) }));
  const result = await getSystemHealth();
  expect(result.status).toBe('HEALTHY');
  expect(result.services.map((service) => service.status)).toEqual(['UP', 'UP']);
  expect(Number.isNaN(Date.parse(result.checkedAt))).toBe(false);
});

it('reports failed probes without exposing database errors or claiming the service is online', async () => {
  vi.spyOn(healthRepository, 'checkDatabase').mockRejectedValue(new Error('private connection details'));
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private upstream details')));
  const result = await getSystemHealth();
  expect(result.status).toBe('DEGRADED');
  expect(result.services.map((service) => service.status)).toEqual(['DOWN', 'DOWN']);
  expect(JSON.stringify(result)).not.toContain('private');
});

it('rejects an HTTP 200 response that is not the AI health contract', async () => {
  vi.spyOn(healthRepository, 'checkDatabase').mockResolvedValue();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) }));
  expect((await getSystemHealth()).services[1].status).toBe('DOWN');
});
