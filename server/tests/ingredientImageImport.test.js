// D:/SWP391/SWP391/server/tests/ingredientImageImport.test.js
// Kiểm thử script nhập ảnh nguyên liệu khi không có file cục bộ và nhà cung cấp ảnh bị lỗi.
import { afterEach, expect, it, vi } from 'vitest';

// Giả lập file ảnh cục bộ bị thiếu và danh mục nguyên liệu chỉ có một mục để test cô lập.
vi.mock('node:fs/promises', () => ({ readFile: vi.fn().mockRejectedValue(new Error('Missing file')) }));
vi.mock('../scripts/ingredient-catalog.js', () => ({ ingredientCatalog: [
  { name: 'Bắp ngọt', photoFile: 'VegCorn.jpg', image_url: '/ingredient-assets/sweet-corn.jpg' },
] }));

import { importIngredientImages } from '../scripts/import-ingredient-images.js';

// Khôi phục mock và biến toàn cục sau mỗi test để không ảnh hưởng test khác.
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// Khi mọi nguồn ảnh đều lỗi, script không được mở transaction ghi đè ảnh đang lưu trong DB (trả về 0 ảnh cập nhật).
it('preserves stored images when local files and the image provider are unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const transaction = vi.fn();
  expect(await importIngredientImages({ $transaction: transaction })).toBe(0);
  expect(transaction).not.toHaveBeenCalled();
});
