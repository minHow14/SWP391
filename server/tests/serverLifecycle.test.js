// D:/SWP391/SWP391/server/tests/serverLifecycle.test.js
// Kiểm thử vòng đời tiến trình server: khởi động worker nền cùng API và tắt máy êm (graceful shutdown).
import { afterEach, expect, it, vi } from 'vitest';

// Trạng thái dùng chung giữa các mock (khai báo bằng vi.hoisted vì vi.mock được đưa lên đầu file trước import).
const state = vi.hoisted(() => ({ handlers: {}, signals: [], order: [], releaseWorker: null, releaseModeration: null }));
const disconnect = vi.hoisted(() => vi.fn(async () => { state.order.push('database disconnected'); }));
// Mock app, config, Prisma, logger, cron và hai worker để quan sát thứ tự dừng mà không mở cổng mạng hay DB thật.
// Mỗi worker trả về Promise chỉ hoàn tất khi test gọi hàm release tương ứng.
vi.mock('../src/app.js', () => ({ default: { listen: (_port, ready) => {
  ready();
  return { close: (done) => done() };
} } }));
vi.mock('../src/config/index.js', () => ({ default: { port: 5000, env: 'test' } }));
vi.mock('../src/config/prisma.js', () => ({ default: { $disconnect: disconnect } }));
vi.mock('../src/config/logger.js', () => ({ logger: { error: vi.fn() } }));
vi.mock('../src/services/purge.service.js', () => ({ startAutoPurgeCron: vi.fn() }));
vi.mock('../src/workers/videoRecipeSummaryWorker.js', () => ({ runVideoRecipeSummaryWorker: ({ signal }) => {
  state.signals.push(signal);
  return new Promise((resolve) => { state.releaseWorker = () => { state.order.push('worker stopped'); resolve(); }; });
} }));
vi.mock('../src/workers/contentModerationWorker.js', () => ({ runContentModerationWorker: ({ signal }) => {
  state.signals.push(signal);
  return new Promise((resolve) => { state.releaseModeration = () => { state.order.push('moderation stopped'); resolve(); }; });
} }));

// Giải phóng worker còn treo và khôi phục spy sau mỗi test để tránh rò rỉ Promise.
afterEach(() => { state.releaseWorker?.(); state.releaseModeration?.(); vi.restoreAllMocks(); });

// Khi nhận SIGTERM, server phải phát tín hiệu abort cho cả hai worker, chờ chúng dừng hẳn rồi mới ngắt kết nối PostgreSQL
// và thoát với mã 0 — tránh mất dữ liệu job đang xử lý dở.
it('starts background workers with the API and awaits their shutdown before disconnecting PostgreSQL', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(process, 'on').mockImplementation((event, handler) => { state.handlers[event] = handler; return process; });
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => {});
  await import('../src/server.js');
  expect(state.signals).toHaveLength(2);
  expect(state.signals.every((signal) => !signal.aborted)).toBe(true);
  await state.handlers.SIGTERM('SIGTERM');
  expect(state.signals.every((signal) => signal.aborted)).toBe(true);
  state.releaseWorker();
  await Promise.resolve();
  expect(disconnect).not.toHaveBeenCalled();
  state.releaseModeration();
  await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
  expect(state.order).toEqual(['worker stopped', 'moderation stopped', 'database disconnected']);
});
