// D:/SWP391/SWP391/server/scripts/import-ingredient-images.js
// Nạp ảnh nguyên liệu (kèm thông tin ghi công và giấy phép) vào bảng ingredient_images trong PostgreSQL.
// Ưu tiên ảnh local trong client/public/ingredient-assets, thiếu thì thử tải từ Wikimedia Commons.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from '../src/config/prisma.js';
import { ingredientCatalog } from './ingredient-catalog.js';
import { ingredientImageUrl } from '../src/services/workspace.service.js';

const assetDirectory = new URL('../../client/public/ingredient-assets/', import.meta.url);
// Chuẩn hoá tên file Wikimedia để so khớp (gạch dưới tương đương khoảng trắng, không phân biệt hoa thường).
const normalize = (value) => value.replaceAll('_', ' ').toLowerCase();
// Loại bỏ thẻ HTML trong metadata Wikimedia để lưu văn bản thuần.
const plain = (value) => (value || '').replace(/<[^>]*>/g, '').replaceAll('&amp;', '&').replace(/\s+/g, ' ').trim();

// Wikimedia yêu cầu User-Agent định danh rõ ràng, nếu không có thể bị chặn.
const WIKIMEDIA_USER_AGENT = 'ChayXanh-SWP391/1.0 (https://github.com/swp391; contact: support@chayxanh.local)';

// Gọi API Wikimedia Commons để lấy URL ảnh và metadata (tác giả, giấy phép) của một nguyên liệu.
async function photoInfo(entry) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '640',
    titles: `File:${entry.photoFile}`,
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': WIKIMEDIA_USER_AGENT },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Cannot retrieve photo source: HTTP ${response.status}`);
  const info = Object.values((await response.json()).query?.pages || {})[0]?.imageinfo?.[0];
  if (!info) throw new Error(`Missing photo source: ${entry.photoFile}`);
  return info;
}

// Nạp ảnh cho toàn bộ nguyên liệu trong catalog; trả về số ảnh đã lưu. Nhận db để test có thể truyền client riêng.
export async function importIngredientImages(db = prisma) {
  const sources = await readFile(new URL('sources.json', assetDirectory), 'utf8').then(JSON.parse).catch(() => []);
  let licenseText = await readFile(new URL('GFDL-1.2.html', assetDirectory), 'utf8').catch(() => null);
  // Đọc toàn bộ file trước để ảnh bị thiếu không thể gây ra việc nạp dở dang.
  const assets = [];
  for (const entry of ingredientCatalog) {
    const filename = entry.image_url.split('/').at(-1);
    let image_data = await readFile(new URL(filename, assetDirectory)).catch(() => null);
    let mime_type = filename.endsWith('.svg') ? 'image/svg+xml' : filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
    let info = sources.find((p) => normalize(p.title) === normalize(`File:${entry.photoFile}`))?.imageinfo?.[0];

    // Thử tải thông tin và dữ liệu ảnh từ Wikimedia Commons nếu thiếu ảnh local
    if (!image_data && !filename.endsWith('.svg')) {
      try {
        if (!info) info = await photoInfo(entry);
        if (info) {
          const downloadUrl = info.thumburl || info.url;
          if (downloadUrl) {
            const response = await fetch(downloadUrl, {
              headers: { 'User-Agent': WIKIMEDIA_USER_AGENT },
              signal: AbortSignal.timeout(5000),
            });
            const fetchedMime = response.headers.get('content-type')?.split(';')[0];
            if (response.ok && ['image/jpeg', 'image/png', 'image/webp'].includes(fetchedMime)) {
              mime_type = fetchedMime;
              image_data = Buffer.from(await response.arrayBuffer());
            }
          }
        }
      } catch (fetchErr) {
        // Tránh làm crash seed khi runner bị Wikimedia rate-limit 429 hoặc offline
        console.warn(`[seed] Bỏ qua tải ảnh trực tuyến cho "${entry.name}": ${fetchErr.message}`);
      }
    }

    // Tải ảnh thất bại không được ghi đè ảnh thật đã lưu bằng dữ liệu giữ chỗ.
    if (!image_data) {
      console.warn(`[seed] Chưa có ảnh thực tế cho "${entry.name}"; giữ nguyên ảnh trong DB.`);
      continue;
    }

    // Không có metadata giấy phép nghĩa là ảnh minh hoạ do dự án tự vẽ.
    const license = plain(info?.extmetadata?.LicenseShortName?.value) || 'Original project illustration';
    // Giấy phép GFDL bắt buộc kèm toàn văn giấy phép nên cần tải nội dung nếu chưa có bản local.
    if (/GFDL/.test(license) && !licenseText) {
      try {
        const params = new URLSearchParams({
          action: 'parse',
          format: 'json',
          page: 'Commons:GNU Free Documentation License, version 1.2',
          prop: 'text',
        });
        const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
          headers: { 'User-Agent': WIKIMEDIA_USER_AGENT },
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          licenseText = (await response.json()).parse?.text?.['*'];
        }
      } catch {
        /* Bỏ qua lỗi lấy license text */
      }
    }
    assets.push({
      ...entry,
      image_data,
      mime_type,
      attribution: plain(info?.extmetadata?.Artist?.value),
      source_url: info?.descriptionurl || null,
      license,
    });
  }
  if (!assets.length) return 0;
  let imported = 0;
  // Ghi tất cả trong một transaction để không bị trạng thái nạp một phần.
  await db.$transaction(
    async (tx) => {
      // Tạo bảng nếu chưa có để script chạy được cả trên DB cũ chưa có bảng này.
      await tx.$executeRaw`CREATE TABLE IF NOT EXISTS ingredient_images (
      ingredient_id INTEGER PRIMARY KEY REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
      mime_type VARCHAR(50) NOT NULL, image_data BYTEA NOT NULL,
      attribution TEXT, source_url TEXT, license TEXT, license_text TEXT
    )`;
      for (const asset of assets) {
        const ingredient = await tx.ingredient.findUnique({ where: { name: asset.name } });
        if (!ingredient) continue;
        const { image_data, mime_type, attribution, source_url, license } = asset;
        const text = /GFDL/.test(license) ? licenseText : null;
        await tx.$executeRaw`INSERT INTO ingredient_images (ingredient_id, mime_type, image_data, attribution, source_url, license, license_text)
        VALUES (${ingredient.ingredient_id}, ${mime_type}, ${image_data}, ${attribution}, ${source_url}, ${license}, ${text})
        ON CONFLICT (ingredient_id) DO UPDATE SET mime_type = EXCLUDED.mime_type, image_data = EXCLUDED.image_data,
          attribution = EXCLUDED.attribution, source_url = EXCLUDED.source_url, license = EXCLUDED.license, license_text = EXCLUDED.license_text`;
        // Chỉ trỏ image_url sang ảnh trong DB khi đang để trống hoặc đang dùng ảnh mặc định, giữ nguyên ảnh người dùng tự cập nhật.
        const details = await tx.ingredientDetails.findUnique({ where: { ingredient_id: ingredient.ingredient_id } });
        if (
          details &&
          (!details.image_url ||
            details.image_url.startsWith('/ingredient-assets/') ||
            details.image_url === '/demo-assets/mushroom-soup.webp')
        ) {
          await tx.ingredientDetails.update({
            where: { ingredient_id: ingredient.ingredient_id },
            data: { image_url: ingredientImageUrl(ingredient.ingredient_id) },
          });
        }
        imported++;
      }
    },
    { timeout: 60000 }
  );
  return imported;
}

// Chạy độc lập khi gọi trực tiếp bằng node.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(`Đã lưu ${await importIngredientImages()} ảnh nguyên liệu trực tiếp trong PostgreSQL.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
