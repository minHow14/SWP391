// D:/SWP391/SWP391/server/tests/videoRecipeSummaryWorker.test.js
// Kiểm thử vòng đời worker tóm tắt công thức từ video: thu hồi job hết hạn, gia hạn lease và dừng an toàn.
import { describe, expect, it, vi } from 'vitest';
import { runVideoRecipeSummaryWorker } from '../src/workers/videoRecipeSummaryWorker.js';

// Job giả dùng chung cho các test.
const JOB = { id: 'job-fixture', leaseToken: 'lease-fixture' };
// Tạo bộ phụ thuộc giả (config, repository, logger, processJob) cùng AbortController để điều khiển worker.
// @returns {{ controller, options }}
function context() {
  const controller = new AbortController();
  return { controller, options: { signal: controller.signal, config: { leaseMs: 30, pollMs: 1, retryMs: 1, maxAttempts: 3 },
    repository: { recoverExpired: vi.fn().mockResolvedValue(), claim: vi.fn().mockResolvedValue(JOB), renew: vi.fn().mockResolvedValue() },
    logger: { info: vi.fn(), error: vi.fn() }, processJob: vi.fn() } };
}

// Nhóm test: hành vi vòng lặp của worker tóm tắt video chạy cục bộ.
describe('local video recipe worker lifecycle', () => {
  // Worker phải thu hồi job hết hạn trước khi nhận job mới và chỉ dừng sau khi job đang chạy hoàn tất.
  it('recovers expired jobs before claiming and stops after its active job finishes', async () => {
    const { controller, options } = context();
    options.processJob.mockImplementation(async (job) => { expect(job.id).toBe(JOB.id); controller.abort(); return { status: 'COMPLETED' }; });
    await runVideoRecipeSummaryWorker(options);
    expect(options.repository.recoverExpired.mock.invocationCallOrder[0]).toBeLessThan(options.repository.claim.mock.invocationCallOrder[0]);
    expect(options.processJob).toHaveBeenCalledOnce();
    expect(options.logger.info).toHaveBeenLastCalledWith('Video recipe worker stopped');
  });
  // Khi heartbeat gia hạn lease thất bại (lease bị worker khác lấy), worker phải hủy xử lý job và ghi log mã lỗi
  // để tránh hai worker cùng ghi kết quả một job.
  it('aborts processing when a heartbeat loses the lease', async () => {
    const { controller, options } = context();
    const failure = Object.assign(new Error('Lease lost'), { errorCode: 'VIDEO_JOB_LEASE_LOST' });
    options.repository.renew.mockRejectedValue(failure);
    options.processJob.mockImplementation((job, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => { controller.abort(); reject(signal.reason); }, { once: true });
    }));
    await runVideoRecipeSummaryWorker(options);
    expect(options.repository.renew).toHaveBeenCalled();
    expect(options.logger.error).toHaveBeenCalledWith({ errorCode: 'VIDEO_JOB_LEASE_LOST' }, expect.any(String));
  });
  // Abort khi worker đang chờ poll (không có job) phải dừng êm, không phát sinh unhandled rejection.
  it('stops an idle polling loop without an unhandled rejection', async () => {
    const { controller, options } = context();
    options.repository.claim.mockResolvedValue(null);
    const timer = setTimeout(() => controller.abort(), 10);
    try { await runVideoRecipeSummaryWorker(options); } finally { clearTimeout(timer); }
    expect(options.processJob).not.toHaveBeenCalled();
    expect(options.logger.error).not.toHaveBeenCalled();
  });
});
