// D:/SWP391/SWP391/server/tests/ingredient-images.integration.mjs
import './loadTestEnvironment.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
try {
  const response = await request(app).get('/api/workspace/catalog');
  assert.equal(response.status, 200);
  const rows = await prisma.$queryRaw`SELECT ingredient_id, mime_type, image_data FROM ingredient_images`;
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
