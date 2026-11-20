// d:\Projects\FPT\SWP391\server\scripts\repair-ingredients.js
// Sửa/bổ sung chi tiết nguyên liệu (ingredient_details) theo catalog chuẩn mà không ghi đè dữ liệu người dùng đã nhập.
import prisma from '../src/config/prisma.js';
import { ingredientCatalog } from './ingredient-catalog.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ingredientImageUrl } from '../src/services/workspace.service.js';

// Duyệt catalog và upsert chi tiết cho từng nguyên liệu đã có trong DB; trả về số nguyên liệu đã xử lý.
export async function repairIngredientDetails(db = prisma) {
  let repaired = 0;
  await db.$transaction(async (tx) => {
    for (const entry of ingredientCatalog) {
      const ingredient = await tx.ingredient.findFirst({ where: { name: entry.name } });
      if (!ingredient) continue;
      const existing = await tx.ingredientDetails.findUnique({ where: { ingredient_id: ingredient.ingredient_id } });
      const { category, origin, plant, description, cooking, aliases } = entry;
      const image_url = ingredientImageUrl(ingredient.ingredient_id);
      const defaults = { category, origin, plant, description, cooking, aliases, image_url };
      // Chỉ sửa các trường còn thiếu/mang giá trị seed chung chung; giữ lại ảnh và mô tả do người dùng cung cấp.
      const data = existing
        ? {
            ...(existing.category === 'other' ? { category } : {}),
            ...(['Thực vật', 'Động vật', 'Chưa cập nhật'].includes(existing.origin) ? { origin, plant } : {}),
            ...(!existing.description || existing.description.includes('được lưu trong database') ? { description } : {}),
            ...(!existing.cooking || existing.cooking === 'Chế biến theo công thức và hướng dẫn của sản phẩm.' ? { cooking } : {}),
            ...(!existing.aliases || existing.aliases === entry.name ? { aliases } : {}),
            ...(!existing.image_url || existing.image_url === '/demo-assets/mushroom-soup.webp' || existing.image_url.startsWith('/ingredient-assets/') ? { image_url } : {}),
          }
        : defaults;
      await tx.ingredientDetails.upsert({
        where: { ingredient_id: ingredient.ingredient_id },
        create: { ingredient_id: ingredient.ingredient_id, ...defaults },
        update: data,
      });
      repaired++;
    }
  }, { timeout: 30000 });
  return repaired;
}

// Chạy độc lập khi gọi trực tiếp bằng node.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(`Đã cập nhật chi tiết cho ${await repairIngredientDetails()} nguyên liệu; giữ nguyên các dữ liệu khác.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
