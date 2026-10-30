// D:/SWP391/SWP391/server/tests/serverLifecycle.test.js
import { afterEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ handlers: {}, signals: [], order: [], releaseWorker: null, releaseModeration: null }));
const disconnect = vi.hoisted(() => vi.fn(async () => { state.order.push('database disconnected'); }));
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

afterEach(() => { state.releaseWorker?.(); state.releaseModeration?.(); vi.restoreAllMocks(); });

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
