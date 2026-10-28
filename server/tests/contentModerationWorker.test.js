// D:/SWP391/SWP391/server/tests/contentModerationWorker.test.js
import { describe, expect, it, vi } from 'vitest';
import { runContentModerationWorker } from '../src/workers/contentModerationWorker.js';

function setup() {
  const controller = new AbortController();
  const repository = { recoverExpired: vi.fn(), claim: vi.fn().mockResolvedValue(null) };
  const log = { info: vi.fn(), error: vi.fn() };
  return { controller, options: { repository, log, signal: controller.signal,
    config: { enabled: true, pollMs: 1 }, processJob: vi.fn() } };
}
describe('local content moderation worker', () => {
  it('does not poll when the feature is disabled', async () => {
    const { options } = setup();
    await runContentModerationWorker({ ...options, config: { enabled: false } });
    expect(options.repository.claim).not.toHaveBeenCalled();
  });
  it('recovers expired leases before claiming work and stops gracefully', async () => {
    const { controller, options } = setup();
    options.repository.claim.mockResolvedValueOnce({ id: 'job' });
    options.processJob.mockImplementation(async () => { controller.abort(); return { status: 'COMPLETED' }; });
    await runContentModerationWorker(options);
    expect(options.repository.recoverExpired.mock.invocationCallOrder[0]).toBeLessThan(options.repository.claim.mock.invocationCallOrder[0]);
    expect(options.processJob).toHaveBeenCalledOnce();
    expect(options.log.error).not.toHaveBeenCalled();
  });
  it('recovers from an operation error and aborts an idle poll', async () => {
    const { controller, options } = setup();
    options.repository.claim.mockRejectedValueOnce(new Error('Database temporarily unavailable'));
    const timer = setTimeout(() => controller.abort(), 20);
    try { await runContentModerationWorker(options); } finally { clearTimeout(timer); }
    expect(options.log.error).toHaveBeenCalled();
    expect(options.processJob).not.toHaveBeenCalled();
  });
});
