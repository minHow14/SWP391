import { test, expect } from 'vitest';
import { repairIngredientDetails } from '../prisma/repair-ingredients.js';

function fixture(name, existing) {
  const saved = [];
  const tx = {
    ingredient: { findFirst: async ({ where }) => where.name === name ? { ingredient_id: 101 } : null },
    ingredientDetails: {
      findUnique: async () => existing,
      upsert: async value => { saved.push(value); },
    },
  };
  return { saved, db: { $transaction: async callback => callback(tx) } };
}

test('repair corrects seed mushroom categories and missing photos without relying on seed IDs', async () => {
  const { db, saved } = fixture('Nấm đông cô tươi', {
    category: 'other', origin: 'Thực vật', plant: true,
    description: 'Thông tin được lưu trong database', cooking: 'Chế biến theo công thức và hướng dẫn của sản phẩm.', aliases: 'Nấm đông cô tươi', image_url: null,
  });
  expect(await repairIngredientDetails(db)).toBe(1);
  expect(saved[0].where).toEqual({ ingredient_id: 101 });
  expect(saved[0].update).toMatchObject({ category: 'mushroom', origin: 'Nấm', image_url: '/api/workspace/ingredients/101/image' });
  expect(saved[0].update.description).not.toContain('database');
});

test('repair preserves edited photos, descriptions and preparation instructions', async () => {
  const { db, saved } = fixture('Đậu hũ non', {
    category: 'protein', origin: 'Thực vật', plant: true,
    description: 'Nội dung do người dùng bổ sung.', cooking: 'Cách chế biến riêng.', aliases: 'Tên riêng.', image_url: '/uploads/custom-tofu.jpg',
  });
  await repairIngredientDetails(db);
  expect(saved[0].update).not.toHaveProperty('image_url');
  expect(saved[0].update).not.toHaveProperty('description');
  expect(saved[0].update).not.toHaveProperty('cooking');
});

test('repair initializes absent details and fixes mozzarella animal origin', async () => {
  const { db, saved } = fixture('Phô mai Mozzarella', null);
  await repairIngredientDetails(db);
  expect(saved[0].create).toMatchObject({ ingredient_id: 101, origin: 'Động vật', plant: false, image_url: '/api/workspace/ingredients/101/image' });
});
