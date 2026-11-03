// D:/SWP391/SWP391/server/tests/real-image-assets.integration.mjs
import './loadTestEnvironment.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function readManifest(kind) {
  const text = await readFile(new URL(`../../docs/${kind}-image-sources.json`, import.meta.url), 'utf8');
  const manifest = JSON.parse(text);
  assert.deepEqual(manifest.failures, []);
  assert.ok(manifest.records.length > 0);
  return manifest.records;
}

async function verifyPhoto(record, hashes) {
  assert.match(record.imageUrl, /^\/uploads\/(restaurants|recipes)\/[\w.-]+$/);
  assert.match(record.sourcePage, /^https:\/\//);
  const bytes = await readFile(new URL(`..${record.imageUrl}`, import.meta.url));
  assert.equal(bytes.length, record.bytes);
  assert.ok(bytes.length > 1024);
  assert.equal(sha256(bytes), record.sha256);
  assert.ok(!hashes.has(record.sha256), `Duplicate photo: ${record.imageUrl}`);
  hashes.add(record.sha256);
  const response = await request(app).get(record.imageUrl);
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /^image\/(jpeg|png|webp)/);
  assert.equal(sha256(response.body), record.sha256);
}

try {
  const manifests = await Promise.all(['restaurant', 'recipe'].map(readManifest));
  const hashes = new Set();
  for (const record of manifests.flat()) await verifyPhoto(record, hashes);
  console.info(`Verified ${hashes.size} distinct local photos against manifests and HTTP responses.`);
} finally { await prisma.$disconnect(); }
