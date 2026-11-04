// D:/SWP391/SWP391/server/tests/videoRecipeSummaryCaptions.integration.mjs
import './loadTestEnvironment.js';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import request from 'supertest';

const database = new URL(process.env.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) && database.pathname.endsWith('_test'),
  'Live verification requires an isolated local _test database.');
const local = dotenv.parse(readFileSync(new URL('../.env', import.meta.url)));
for (const name of ['AI_SERVICE_URL', 'INTERNAL_API_KEY', 'YT_DLP_PATH']) {
  if (local[name]) process.env[name] = local[name];
}
process.env.AI_SERVICE_URL ||= 'http://127.0.0.1:8000';
process.env.YT_DLP_PATH ||= fileURLToPath(new URL(`../../ai_service/venv/${process.platform === 'win32' ? 'Scripts/yt-dlp.exe' : 'bin/yt-dlp'}`, import.meta.url));
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.AI_SERVICE_URL).hostname),
  'The AI service must be on loopback.');
const [{ default: app }, { default: prisma }, { generateToken }, { videoRecipeSummaryJobRepository: jobs },
  { processVideoRecipeSummaryJob }, { runVideoRecipeSummaryWorker }, { videoRecipeSummaryConfig: config },
  { createVideoRecipeSummaryAiService }, { aiConfig }] = await Promise.all([
  import('../src/app.js'), import('../src/config/prisma.js'), import('../src/utils/jwt.js'),
  import('../src/repositories/videoRecipeSummaryJobRepository.js'), import('../src/services/videoRecipeSummaryProcessor.js'),
  import('../src/workers/videoRecipeSummaryWorker.js'), import('../src/config/videoRecipeSummaryConfig.js'),
  import('../src/services/videoRecipeSummaryAiService.js'), import('../src/config/aiConfig.js'),
]);
const JOBS = '/api/v1/video-recipe-summary-jobs';
const RECIPE_URL = 'https://www.youtube.com/watch?v=mEZH98MSaLc';
const NO_CAPTIONS_URL = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
const JOB_WAIT_MS = 240_000;
const POLL_MS = 500;
const results = [];
let owner, authorization, controller, worker;

function api(method, path, body) {
  const call = request(app)[method](path).set('Authorization', authorization).timeout({ response: 10_000, deadline: 15_000 });
  return body === undefined ? call : call.send(body);
}

function startWorker(ai) {
  controller = new AbortController();
  worker = runVideoRecipeSummaryWorker({ signal: controller.signal, config: { ...config, maxAttempts: 1, pollMs: 250 },
    processJob: (job, options) => processVideoRecipeSummaryJob(job, { ...options, ai }) });
}

async function stopWorker() {
  controller?.abort();
  await worker;
  worker = undefined;
  controller = undefined;
}

async function waitForJob(jobId) {
  const deadline = Date.now() + JOB_WAIT_MS;
  while (Date.now() < deadline) {
    const response = await api('get', `${JOBS}/${jobId}`);
    assert.equal(response.status, 200);
    if (['FAILED', 'COMPLETED'].includes(response.body.data.status)) return response.body.data;
    await delay(POLL_MS);
  }
  throw new Error('Live video job exceeded its bounded verification deadline.');
}

async function verifyManualRetry() {
  const created = await api('post', JOBS, { videoUrl: RECIPE_URL });
  assert.equal(created.status, 202);
  const jobId = created.body.data.jobId;
  startWorker(createVideoRecipeSummaryAiService({ config: { ...aiConfig, internalApiKey: randomBytes(32).toString('hex') } }));
  const failed = await waitForJob(jobId);
  assert.equal(failed.status, 'FAILED');
  assert.equal(failed.errorCode, 'AI_INTERNAL_AUTH_FAILED');
  await stopWorker();
  assert.equal((await api('post', JOBS, { videoUrl: RECIPE_URL })).status, 409);
  assert.equal((await api('post', `${JOBS}/${jobId}/retries`, {})).status, 202);
  startWorker(createVideoRecipeSummaryAiService());
  const completed = await waitForJob(jobId);
  await verifyStoredRecipe(jobId, completed);
}

async function verifyStoredRecipe(jobId, completed) {
  const stored = await jobs.findOwnedInternal({ id: jobId, userId: owner.user_id });
  if (completed.status !== 'COMPLETED') {
    results.push({ case: 'auth-failure-public-retry-real-recipe', status: 'FAIL', errorCode: completed.errorCode,
      stage: completed.stage, segments: stored.transcript?.segments.length || 0, recipePersisted: Boolean(completed.summaryId) });
  }
  assert.equal(completed.status, 'COMPLETED', `${completed.errorCode || ''}: ${completed.errorMessage || ''}`);
  const summary = await api('get', `/api/v1/video-recipe-summaries/${completed.summaryId}`);
  assert.equal(summary.status, 200);
  assert.ok(summary.body.data.recipe.steps.length > 0);
  assert.equal(stored.transcript.language, 'vi');
  assert.equal(stored.transcript.durationSeconds, stored.metadata.durationSeconds);
  results.push({ case: 'auth-failure-public-retry-real-recipe', status: 'PASS', videoId: stored.videoId,
    segments: stored.transcript.segments.length, steps: summary.body.data.recipe.steps.length });
  process.stdout.write('PASS: real internal-auth failure -> public retry -> Vietnamese captions -> DeepSeek -> persisted recipe.\n');
}

async function verifyMissingCaptions() {
  const created = await api('post', JOBS, { videoUrl: NO_CAPTIONS_URL });
  assert.equal(created.status, 202);
  const failed = await waitForJob(created.body.data.jobId);
  assert.equal(failed.status, 'FAILED');
  assert.equal(failed.errorCode, 'VIDEO_CAPTIONS_UNAVAILABLE');
  assert.equal(failed.errorMessage, 'Video chưa có phụ đề phù hợp');
  assert.equal(failed.summaryId, null);
  const stored = await jobs.findOwnedInternal({ id: failed.jobId, userId: owner.user_id });
  assert.equal(stored.transcript, null);
  results.push({ case: 'real-video-without-vietnamese-captions', status: 'PASS', videoId: stored.videoId });
  process.stdout.write('PASS: source without Vietnamese captions fails explicitly without a transcript or fabricated recipe.\n');
}

async function runCase(check, name) {
  try { await check(); }
  catch (error) {
    if (!results.some((result) => result.case === name)) results.push({ case: name, status: 'FAIL', errorCode: error.code || error.name });
    process.exitCode = 1;
    process.stdout.write(`FAIL: ${name}; see the live result report for sanitized failure details.\n`);
  }
}

try {
  assert.equal(await prisma.videoRecipeSummaryJob.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }), 0,
    'Stop other test workers and finish the existing test queue first.');
  owner = await prisma.user.create({ data: { email: `caption-integration-${randomUUID()}@example.invalid`,
    full_name: 'Caption integration fixture', password_hash: 'unused-test-only-hash' } });
  authorization = `Bearer ${generateToken({ user_id: owner.user_id })}`;
  await runCase(verifyManualRetry, 'auth-failure-public-retry-real-recipe');
  await stopWorker();
  startWorker(createVideoRecipeSummaryAiService());
  await runCase(verifyMissingCaptions, 'real-video-without-vietnamese-captions');
  writeFileSync(new URL('../../docs/superpowers/2026-11-04-captions-live-results.json', import.meta.url),
    JSON.stringify({ verifiedAt: new Date().toISOString(), database: database.pathname.slice(1), results }, null, 2) + '\n');
} finally {
  try { await stopWorker(); }
  finally {
    try { if (owner) await prisma.user.delete({ where: { user_id: owner.user_id } }); }
    finally { await prisma.$disconnect(); }
  }
}
