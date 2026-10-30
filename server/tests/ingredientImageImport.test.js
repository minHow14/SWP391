// D:/SWP391/SWP391/server/tests/ingredientImageImport.test.js
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({ readFile: vi.fn().mockRejectedValue(new Error('Missing file')) }));
vi.mock('../scripts/ingredient-catalog.js', () => ({ ingredientCatalog: [
  { name: 'Bắp ngọt', photoFile: 'VegCorn.jpg', image_url: '/ingredient-assets/sweet-corn.jpg' },
] }));

import { importIngredientImages } from '../scripts/import-ingredient-images.js';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('preserves stored images when local files and the image provider are unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const transaction = vi.fn();
  expect(await importIngredientImages({ $transaction: transaction })).toBe(0);
  expect(transaction).not.toHaveBeenCalled();
});
