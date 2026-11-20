// d:\Projects\FPT\SWP391\server\tests/ingredient-images.integration.mjs
// Script tích hợp (chạy bằng node, cần DB test): xác minh mọi ảnh nguyên liệu trong DB được phục vụ
// đúng byte qua API công khai và catalog chỉ chứa URL ảnh, không nhúng dữ liệu nhị phân.
import './loadTestEnvironment.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

// Băm SHA-256 để so sánh byte ảnh trả qua API với dữ liệu gốc trong DB.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
try {
  const response = await request(app).get('/api/workspace/catalog');
  assert.equal(response.status, 200);
  const rows = await prisma.$queryRaw`SELECT ingredient_id, mime_type, image_data FROM ingredient_images`;
  // Số lượng ảnh cố định theo dữ liệu seed nguyên liệu.
  assert.equal(rows.length, 28);
  for (const image of rows) {
    const ingredient = response.body.data.ingredients.find(item => item.ingredient_id === image.ingredient_id);
    assert.equal(ingredient.image, `/api/workspace/ingredients/${image.ingredient_id}/image`);
    const photo = await request(app).get(ingredient.image);
    assert.equal(photo.status, 200);
    assert.ok(photo.headers['content-type'].startsWith(image.mime_type));
    const bytes = Buffer.isBuffer(photo.body) ? photo.body : Buffer.from(photo.text);
    assert.equal(hash(bytes), hash(image.image_data));
  }
  console.log('Verified all 28 database images through the public API; catalog contains URLs, not binary photo data.');
} finally { await prisma.$disconnect(); }
