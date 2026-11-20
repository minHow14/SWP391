// D:/SWP391/SWP391/server/tests/real-image-assets.integration.mjs
// Script tích hợp (cần DB test): xác minh ảnh thật của nhà hàng/công thức khớp manifest nguồn ảnh
// về kích thước, SHA-256, không trùng lặp và được phục vụ đúng qua HTTP.
import './loadTestEnvironment.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

// Băm SHA-256 để đối chiếu byte ảnh.
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

// Đọc manifest nguồn ảnh theo loại (restaurant/recipe) và đảm bảo không có bản ghi tải lỗi.
// @param kind loại manifest
// @returns danh sách bản ghi ảnh
async function readManifest(kind) {
  const text = await readFile(new URL(`../../docs/${kind}-image-sources.json`, import.meta.url), 'utf8');
  const manifest = JSON.parse(text);
  assert.deepEqual(manifest.failures, []);
  assert.ok(manifest.records.length > 0);
  return manifest.records;
}

// Kiểm tra một ảnh: đường dẫn an toàn, có trang nguồn https, kích thước/băm khớp, không trùng ảnh khác
// và HTTP trả đúng nội dung.
// @param record bản ghi trong manifest
// @param hashes tập băm đã gặp để phát hiện ảnh trùng
async function verifyPhoto(record, hashes) {
  assert.match(record.imageUrl, /^\/uploads\/(restaurants|recipes)\/[\w.-]+$/);
  assert.match(record.sourcePage, /^https:\/\//);
  const bytes = await readFile(new URL(`..${record.imageUrl}`, import.meta.url));
  assert.equal(bytes.length, record.bytes);
  // Ảnh quá nhỏ (≤ 1KB) thường là ảnh lỗi/placeholder nên bị coi là không hợp lệ.
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
