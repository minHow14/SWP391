// D:/SWP391/SWP391/server/scripts/sync-ingredient-assets.js
// Đồng bộ ảnh nguyên liệu từ Wikimedia Commons về client/public/ingredient-assets,
// kèm sources.json (metadata), ATTRIBUTION.md (ghi công) và toàn văn giấy phép GFDL khi cần.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ingredientCatalog } from './ingredient-catalog.js';

const directory = new URL(
  '../../client/public/ingredient-assets/',
  import.meta.url
);
// Ảnh SVG là minh hoạ tự vẽ của dự án nên không cần lấy từ Wikimedia.
await mkdir(directory, { recursive: true });
const photos = ingredientCatalog.filter(
  (entry) => !entry.image_url.endsWith('.svg')
// Dùng lại sources.json đã cache để chỉ gọi API khi còn thiếu metadata.
);
const pages = await readFile(new URL('sources.json', directory), 'utf8')
  .then(JSON.parse)
  .catch(() => []);
// Truy vấn theo lô 5 ảnh mỗi request để giảm số lần gọi API.
for (
  let offset = 0;
  pages.length < photos.length && offset < photos.length;
  offset += 5
) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    titles: photos
      .slice(offset, offset + 5)
      .map((e) => `File:${e.photoFile}`)
      .join('|'),
  });
  const response = await fetch(
    `https://commons.wikimedia.org/w/api.php?${params}`,
    {
      headers: {
        'User-Agent': 'ChayXanh/1.0 (local ingredient asset attribution)',
      },
      signal: AbortSignal.timeout(30000),
    }
  );
  if (!response.ok) throw new Error(`Wikimedia HTTP ${response.status}`);
  pages.push(...Object.values((await response.json()).query.pages));
}
await writeFile(
  new URL('sources.json', directory),
  JSON.stringify(pages, null, 2)
);
// Chuẩn hoá tên file để so khớp với tiêu đề trang Wikimedia.
const normalize = (value) => value.replaceAll('_', ' ').toLowerCase();
// Chuyển HTML trong metadata thành văn bản thuần; thay | để không làm vỡ bảng Markdown.
const plain = (value) =>
  (value || '')
    .replace(/<[^>]*>/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim()
    .replaceAll('|', '/');
// Nội dung file ghi công ảnh (Markdown) sinh ra cho thư mục ảnh.
const credits = [
  '# Ingredient image attribution',
  '',
  'Unmodified Wikimedia Commons photos stored locally. The table below credits each creator and links to the original image and its license. Preserve these credits when redistributing.',
  '',
  '| Asset | Original image | Creator | License |',
  '| --- | --- | --- | --- |',
];

for (const entry of photos) {
  const page = pages.find(
    (p) => normalize(p.title) === normalize(`File:${entry.photoFile}`)
  );
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error(`Missing image information: ${entry.photoFile}`);
  const meta = info.extmetadata;
  // Chỉ chấp nhận ảnh có giấy phép tự do (CC, public domain, GFDL) để được phép phân phối lại.
  const license = plain(meta?.LicenseShortName?.value);
  if (
    meta?.Copyrighted?.value !== 'False' &&
    !/CC|Creative Commons|public domain|GFDL/i.test(license)
  )
    throw new Error(`Unsupported license: ${entry.photoFile}`);
  const filename = entry.image_url.split('/').at(-1);
  // Chỉ tải ảnh khi file local chưa có hoặc rỗng.
  const target = new URL(filename, directory);
  if (!(await readFile(target).catch(() => null))?.length) {
    const image = await fetch(info.thumburl || info.url, {
      signal: AbortSignal.timeout(30000),
    });
    if (!image.ok || !image.headers.get('content-type')?.startsWith('image/'))
      throw new Error(`Cannot download ${entry.photoFile}`);
    await writeFile(target, new Uint8Array(await image.arrayBuffer()));
  }
  credits.push(
    `| ${filename} | [${entry.name}](${info.descriptionurl}) | ${plain(meta?.Artist?.value)} | [${license}](${meta?.LicenseUrl?.value || info.descriptionurl}) |`
  );
}
// Ảnh dùng giấy phép GFDL bắt buộc phải kèm toàn văn giấy phép.
if (
  photos.some((entry) => {
    const page = pages.find(
      (p) => normalize(p.title) === normalize(`File:${entry.photoFile}`)
    );
    return /GFDL/.test(
      page?.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value || ''
    );
  })
) {
  const licenseParams = new URLSearchParams({
    action: 'parse',
    format: 'json',
    page: 'Commons:GNU Free Documentation License, version 1.2',
    prop: 'text',
  });
  const licenseResponse = await fetch(
    `https://commons.wikimedia.org/w/api.php?${licenseParams}`,
    { signal: AbortSignal.timeout(30000) }
  );
  const license = await licenseResponse.json();
  if (!licenseResponse.ok || !license.parse?.text?.['*'])
    throw new Error('Cannot retrieve GFDL license text from Wikimedia Commons');
  await writeFile(
    new URL('GFDL-1.2.html', directory),
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>GNU Free Documentation License 1.2</title><body>${license.parse.text['*']}</body></html>`
  );
  credits.push('', 'GFDL image license: [full license text](GFDL-1.2.html).');
}
await writeFile(
  new URL('ATTRIBUTION.md', directory),
  `${credits.join('\n')}\n`
);
console.log(
  `Verified ${photos.length} local photos, creator credits and licenses; plus the original corn illustration.`
);
