// D:/SWP391/SWP391/server/scripts/repairRestaurantImages.js
// Script hai bước thay mã ảnh Google Places của nhà hàng bằng ảnh tải về lưu local.
// Mặc định: tải ảnh và ghi manifest (không đổi DB); với cờ --apply: kiểm tra manifest rồi cập nhật DB.
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
// Giới hạn 5MB mỗi ảnh để tránh tải file bất thường.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Chỉ tải song song 2 ảnh để không vượt hạn mức của API ảnh.
const CONCURRENT_DOWNLOADS = 2;

// Tải ảnh của một địa điểm, kiểm tra loại/kích thước/trùng lặp rồi lưu file; trả về bản ghi cho manifest.
async function prepareImage(place, hashes) {
  const photoUrl = await resolvePlacePhoto({ placeId: place.place_id, photo: { name: place.image_url } });
  if (!photoUrl) throw new Error('Không lấy được URL ảnh từ đúng Google Place ID.');
  // Chặn redirect để chắc chắn ảnh đến từ đúng URL đã phân giải.
  const response = await fetch(photoUrl, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  const mimeType = response.headers.get('content-type')?.split(';')[0];
  if (!response.ok || !MIME_EXTENSIONS[mimeType]) throw new Error('Nguồn ảnh không trả về JPEG/PNG/WebP.');
  const bytes = Buffer.from(await response.arrayBuffer());
  // Ảnh quá nhỏ thường là ảnh lỗi/giữ chỗ, quá lớn thì không phù hợp để phục vụ.
  if (bytes.length < 1024 || bytes.length > MAX_IMAGE_BYTES) throw new Error('Kích thước ảnh không phù hợp.');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  // Dùng hash nội dung để phát hiện nhiều quán bị gán cùng một ảnh.
  if (hashes.has(sha256)) throw new Error(`Ảnh trùng với quán ${hashes.get(sha256)}; chưa cập nhật.`);
  hashes.set(sha256, place.restaurant_id);
  const filename = `google-${place.restaurant_id}-${sha256.slice(0, 12)}.${MIME_EXTENSIONS[mimeType]}`;
  await writeFile(new URL(filename, ROOT), bytes);
  return { restaurantId: place.restaurant_id, placeId: place.place_id, name: place.name,
    previousImageUrl: place.image_url, imageUrl: `/uploads/restaurants/${filename}`, photoUrl,
    sourcePage: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`,
    mimeType, bytes: bytes.length, sha256, checkedAt: new Date().toISOString() };
}

// Bước 1: tải ảnh cho các quán còn dùng mã ảnh Google ("places/...") và ghi manifest, chưa đụng tới DB.
async function prepareImages() {
  const places = await placeRepository.findRestaurants({
    where: { place_id: { not: null }, image_url: { startsWith: 'places/' } },
    select: { restaurant_id: true, place_id: true, name: true, image_url: true },
    orderBy: { restaurant_id: 'asc' },
  });
  if (!places.length) return console.info('Không có mã ảnh Google chưa xử lý.');
  await mkdir(ROOT, { recursive: true });
  const records = [], failures = [], hashes = new Map();
  // Xử lý theo lô nhỏ để giới hạn số request đồng thời.
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

// Bước 2: xác minh lại hash từng file trong manifest rồi cập nhật image_url trong một transaction.
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
    // Nếu số bản ghi cập nhật không khớp, dữ liệu quán đã bị thay đổi sau bước 1 nên huỷ để không ghi đè.
    if (updated.length !== records.length) throw new Error('Ảnh quán đã thay đổi; hủy transaction để giữ dữ liệu mới.');
  });
  console.info(JSON.stringify({ updated: records.length, distinctPhotos: hashes.size }));
}

// Chạy độc lập khi gọi trực tiếp bằng node; --apply chuyển sang bước cập nhật DB.
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
