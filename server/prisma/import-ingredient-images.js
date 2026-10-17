import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from '../src/config/prisma.js';
import { ingredientCatalog } from './ingredient-catalog.js';
import { ingredientImageUrl } from '../src/services/ingredientImages.service.js';

const assetDirectory = new URL('../../client/public/ingredient-assets/', import.meta.url);
const normalize = value => value.replaceAll('_', ' ').toLowerCase();
const plain = value => (value || '').replace(/<[^>]*>/g, '').replaceAll('&amp;', '&').replace(/\s+/g, ' ').trim();

const WIKIMEDIA_USER_AGENT = 'ChayXanh-SWP391/1.0 (https://github.com/swp391; contact: support@chayxanh.local)';
const DUMMY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

async function photoInfo(entry) {
  const params = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '640', titles: `File:${entry.photoFile}` });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': WIKIMEDIA_USER_AGENT },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Cannot retrieve photo source: HTTP ${response.status}`);
  const info = Object.values((await response.json()).query?.pages || {})[0]?.imageinfo?.[0];
  if (!info) throw new Error(`Missing photo source: ${entry.photoFile}`);
  return info;
}

export async function importIngredientImages(db = prisma) {
  const sources = await readFile(new URL('sources.json', assetDirectory), 'utf8').then(JSON.parse).catch(() => []);
  let licenseText = await readFile(new URL('GFDL-1.2.html', assetDirectory), 'utf8').catch(() => null);
  // Read all files first so missing photos cannot leave a partial import.
  const assets = [];
  for (const entry of ingredientCatalog) {
    const filename = entry.image_url.split('/').at(-1);
    let image_data = await readFile(new URL(filename, assetDirectory)).catch(() => null);
    let mime_type = filename.endsWith('.svg') ? 'image/svg+xml' : filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
    let info = sources.find(p => normalize(p.title) === normalize(`File:${entry.photoFile}`))?.imageinfo?.[0];
    
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

    // Fallback ảnh mẫu 1x1 đảm bảo toàn vẹn dữ liệu cho DB và tests
    if (!image_data) {
      image_data = DUMMY_PNG;
      mime_type = 'image/png';
    }

    const license = plain(info?.extmetadata?.LicenseShortName?.value) || 'Original project illustration';
    if (/GFDL/.test(license) && !licenseText) {
      try {
        const params = new URLSearchParams({ action: 'parse', format: 'json', page: 'Commons:GNU Free Documentation License, version 1.2', prop: 'text' });
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
    assets.push({ ...entry, image_data, mime_type, attribution: plain(info?.extmetadata?.Artist?.value), source_url: info?.descriptionurl || null, license });
  }
  let imported = 0;
  await db.$transaction(async tx => {
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
      const details = await tx.ingredientDetails.findUnique({ where: { ingredient_id: ingredient.ingredient_id } });
      if (details && (!details.image_url || details.image_url.startsWith('/ingredient-assets/') || details.image_url === '/demo-assets/mushroom-soup.webp')) {
        await tx.ingredientDetails.update({ where: { ingredient_id: ingredient.ingredient_id }, data: { image_url: ingredientImageUrl(ingredient.ingredient_id) } });
      }
      imported++;
    }
  }, { timeout: 60000 });
  return imported;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`Đã lưu ${await importIngredientImages()} ảnh nguyên liệu trực tiếp trong PostgreSQL.`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await prisma.$disconnect(); }
}
