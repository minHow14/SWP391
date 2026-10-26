// D:/SWP391/SWP391/server/tests/ai-internal-auth.integration.mjs
import './loadTestEnvironment.js';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import request from 'supertest';
import { createGuestSession } from './helpers/guestSession.js';

const AI_DIRECTORY = fileURLToPath(new URL('../../ai_service/', import.meta.url));
const PYTHON = process.env.AI_TEST_PYTHON || path.join(AI_DIRECTORY, 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const BE_KEY = process.env.INTERNAL_API_KEY;
const GUEST_ID = `internal-http-${randomUUID()}`;
let child, prisma, member, admin, guestSession;

async function waitUntilHealthy(url) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await fetch(`${url}/health`, { signal: AbortSignal.timeout(500) }).then((response) => response.ok).catch(() => false)) return;
    await delay(100);
  }
  throw new Error('AI test runtime did not become healthy.');
}

async function startAi(key, port = 0) {
  child = spawn(PYTHON, ['-u', '-m', 'tests.serve_internal_auth'], {
    cwd: AI_DIRECTORY, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, INTERNAL_API_KEY: key, AI_TEST_PORT: String(port),
      DEEPSEEK_API_KEY: '', OPENAI_API_KEY: '', PYTHONDONTWRITEBYTECODE: '1' },
  });
  // Output from the child is deliberately not echoed because it may contain configuration diagnostics.
  child.stderr.resume();
  const ready = new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const match = /AI_TEST_READY (\d+)/.exec(output);
      if (match) resolve(Number(match[1]));
    });
    child.once('error', () => reject(new Error('Cannot start AI test runtime; set AI_TEST_PYTHON.')));
    child.once('exit', () => reject(new Error('AI test runtime stopped before readiness.')));
  });
  const timer = setTimeout(() => child.kill(), 15_000);
  try {
    const actualPort = await ready;
    const url = `http://127.0.0.1:${actualPort}`;
    await waitUntilHealthy(url);
    return { port: actualPort, url };
  } finally { clearTimeout(timer); }
}

async function stopAi() {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill();
  await exited;
}

try {
  const target = await startAi(randomBytes(32).toString('hex'));
  process.env.AI_SERVICE_URL = target.url;
  process.env.AI_TIMEOUT_MS = '10000';
  const { default: app } = await import('../src/app.js');
  ({ default: prisma } = await import('../src/config/prisma.js'));
  guestSession = await createGuestSession(app);
  const { generateToken } = await import('../src/utils/jwt.js');
  const data = (name, role) => ({ email: `${GUEST_ID}-${name}@example.invalid`, full_name: name, role, password_hash: 'unused-test-hash' });
  member = await prisma.user.create({ data: data('member', 2) });
  admin = await prisma.user.create({ data: data('admin', 1) });
  const successBefore = await prisma.aiLog.count({ where: { status: 'SUCCESS' } });
  for (const [route, body] of [
    ['chat/stream', { message: 'Kiểm tra khóa lệch' }],
    ['meal-planner/generate/stream', { heightCm: 170, weightKg: 65 }],
  ]) {
    const response = await guestSession.agent.post(`/api/ai/${route}`).send(body);
    assert.equal(response.status, 503);
    assert.equal(response.body.errorCode, 'AI_INTERNAL_AUTH_FAILED');
    assert.ok(!JSON.stringify(response.body).includes(BE_KEY));
    assert.equal((await prisma.guestQuota.findFirst({ where: { guestId: guestSession.guestId } })).usedCount, 0);
  }
  const failed = await request(app).post('/api/ai/chat/stream')
    .set('Authorization', `Bearer ${generateToken({ user_id: member.user_id })}`).send({ message: 'Kiểm tra lịch sử thất bại' });
  assert.equal(failed.status, 503);
  const record = await prisma.aiGeneration.findFirst({ where: { userId: member.user_id } });
  assert.equal(record.status, 'FAILED');
  assert.equal(record.errorCode, 'AI_INTERNAL_AUTH_FAILED');
  assert.equal(await prisma.aiLog.count({ where: { status: 'SUCCESS' } }), successBefore);
  const clear = () => request(app).post('/api/admin/ai/chatbot-cache/clear')
    .set('Authorization', `Bearer ${generateToken({ user_id: admin.user_id })}`);
  assert.equal((await clear()).body.errorCode, 'AI_INTERNAL_AUTH_FAILED');
  await stopAi();
  await startAi(BE_KEY, target.port);
  const recovered = await clear();
  assert.equal(recovered.status, 200);
  assert.equal(recovered.body.data.cleared, 0);
  process.stdout.write('PASS: real BE → FastAPI HTTP rejects mismatched keys, refunds quota, saves FAILED and recovers after key synchronization. No provider calls.\n');
} finally {
  await stopAi();
  if (prisma) {
    const ids = [member?.user_id, admin?.user_id].filter(Boolean);
    await prisma.user.deleteMany({ where: { user_id: { in: ids } } });
    if (guestSession) await prisma.guestQuota.deleteMany({ where: { guestId: guestSession.guestId } });
    await prisma.$disconnect();
  }
}
