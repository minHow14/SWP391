// D:/SWP391/SWP391/server/scripts/repairRestaurantImages.js
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import prisma from '../src/config/prisma.js';
import { placeRepository } from '../src/repositories/place.repository.js';
import { resolvePlacePhoto } from '../src/services/places.service.js';

const ROOT = new URL('../uploads/restaurants/', import.meta.url);
const MANIFEST = new URL('../../docs/restaurant-image-sources.json', import.meta.url);
const MIME_EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CONCURRENT_DOWNLOADS = 2;

async function prepareImage(place, hashes) {
  const photoUrl = await resolvePlacePhoto({ placeId: place.place_id, photo: { name: place.image_url } });
  if (!photoUrl) throw new Error('Không lấy được URL ảnh từ đúng Google Place ID.');
  const response = await fetch(photoUrl, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  const mimeType = response.headers.get('content-type')?.split(';')[0];
  if (!response.ok || !MIME_EXTENSIONS[mimeType]) throw new Error('Nguồn ảnh không trả về JPEG/PNG/WebP.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1024 || bytes.length > MAX_IMAGE_BYTES) throw new Error('Kích thước ảnh không phù hợp.');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (hashes.has(sha256)) throw new Error(`Ảnh trùng với quán ${hashes.get(sha256)}; chưa cập nhật.`);
  hashes.set(sha256, place.restaurant_id);
  const filename = `google-${place.restaurant_id}-${sha256.slice(0, 12)}.${MIME_EXTENSIONS[mimeType]}`;
  await writeFile(new URL(filename, ROOT), bytes);
  return { restaurantId: place.restaurant_id, placeId: place.place_id, name: place.name,
    previousImageUrl: place.image_url, imageUrl: `/uploads/restaurants/${filename}`, photoUrl,
    sourcePage: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`,
    mimeType, bytes: bytes.length, sha256, checkedAt: new Date().toISOString() };
}

async function prepareImages() {
  const places = await placeRepository.findRestaurants({
    where: { place_id: { not: null }, image_url: { startsWith: 'places/' } },
    select: { restaurant_id: true, place_id: true, name: true, image_url: true },
    orderBy: { restaurant_id: 'asc' },
  });
  if (!places.length) return console.info('Không có mã ảnh Google chưa xử lý.');
  await mkdir(ROOT, { recursive: true });
  const records = [], failures = [], hashes = new Map();
  for (let offset = 0; offset < places.length; offset += CONCURRENT_DOWNLOADS) {
    await Promise.all(places.slice(offset, offset + CONCURRENT_DOWNLOADS).map(async (place) => {
      try {
        records.push(await prepareImage(place, hashes));
        console.info(`Đã tải ảnh quán ${place.restaurant_id}: ${place.name}`);
      } catch (error) {
        failures.push({ restaurantId: place.restaurant_id, reason: error.message });
      }
    }));
  }
  records.sort((a, b) => a.restaurantId - b.restaurantId);
  await writeFile(MANIFEST, `${JSON.stringify({ records, failures }, null, 2)}\n`);
  console.info(JSON.stringify({ prepared: records.length, failures: failures.length, databaseChanged: false }));
}

async function applyImages() {
  const { records } = JSON.parse(await readFile(MANIFEST, 'utf8'));
  const hashes = new Set();
  for (const record of records) {
    const bytes = await readFile(new URL(path.basename(record.imageUrl), ROOT));
    if (createHash('sha256').update(bytes).digest('hex') !== record.sha256 || hashes.has(record.sha256)) {
      throw new Error('Ảnh bị thay đổi hoặc trùng nội dung; chưa ghi DB.');
    }
    hashes.add(record.sha256);
  }
  await prisma.$transaction(async (db) => {
    const updated = await placeRepository.replaceImageUrls(records, db);
    if (updated.length !== records.length) throw new Error('Ảnh quán đã thay đổi; hủy transaction để giữ dữ liệu mới.');
  });
  console.info(JSON.stringify({ updated: records.length, distinctPhotos: hashes.size }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes('--apply')) await applyImages();
    else await prepareImages();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
