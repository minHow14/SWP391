import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/prisma.js';
import { repairIngredientDetails } from './repair-ingredients.js';
import { importIngredientImages } from './import-ingredient-images.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Tách các câu lệnh SQL từ file, đảm bảo an toàn với dấu chấm phẩy nằm trong chuỗi ký tự hoặc comment
 * @param {string} sql
 * @returns {string[]}
 */
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      current += char;
      if (char === "'") {
        if (nextChar === "'") {
          current += nextChar;
          i++;
        } else {
          inString = false;
        }
      }
      continue;
    }

    if (char === '-' && nextChar === '-') {
      inLineComment = true;
      i++;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    if (char === "'") {
      inString = true;
      current += char;
      continue;
    }

    if (char === ';') {
      const trimmed = current.trim();
      if (trimmed && trimmed.toUpperCase() !== 'BEGIN' && trimmed.toUpperCase() !== 'COMMIT') {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const trimmed = current.trim();
  if (trimmed && trimmed.toUpperCase() !== 'BEGIN' && trimmed.toUpperCase() !== 'COMMIT') {
    statements.push(trimmed);
  }

  return statements;
}

async function main() {
  const seedSqlPath = path.join(__dirname, 'seed.sql');

  if (!fs.existsSync(seedSqlPath)) {
    throw new Error(`Không tìm thấy file seed.sql tại: ${seedSqlPath}`);
  }

  console.log('🌱 Đang đọc file seed.sql...');
  const sqlContent = fs.readFileSync(seedSqlPath, 'utf8');
  const statements = splitSqlStatements(sqlContent);

  console.log(`🚀 Bắt đầu import ${statements.length} câu lệnh SQL vào PostgreSQL...`);

  // Thực thi toàn bộ trong một Transaction để đảm bảo tính nguyên vẹn dữ liệu
  await prisma.$transaction(
    async (tx) => {
      for (let i = 0; i < statements.length; i++) {
        await tx.$executeRawUnsafe(statements[i]);
      }
    },
    {
      timeout: 60000, // 60s timeout cho tác vụ seed toàn bộ bảng
    }
  );

  await repairIngredientDetails();
  try {
    await importIngredientImages();
  } catch (imageErr) {
    console.warn('⚠️ Cảnh báo khi nạp ảnh nguyên liệu:', imageErr.message);
  }
  console.log('✅ Import dữ liệu mẫu vào PostgreSQL thành công!');
  console.log('----------------------------------------------------');
  console.log('📋 Thống kê số lượng dữ liệu đã nạp & xác thực:');

  const [
    usersCount,
    postsCount,
    recipesCount,
    restaurantsCount,
    dietTypesCount,
    ingredientsCount,
    categoriesCount,
    mealPlansCount,
    mealPlanDetailsCount,
    foodDiariesCount,
    swapsCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.recipe.count(),
    prisma.restaurant.count(),
    prisma.dietType.count(),
    prisma.ingredient.count(),
    prisma.category.count(),
    prisma.mealPlan.count(),
    prisma.mealPlanDetail.count(),
    prisma.foodDiary.count(),
    prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM ingredient_alternatives`,
  ]);

  console.log(`   - Chế độ ăn (diet_types):           ${dietTypesCount}`);
  console.log(`   - Danh mục (categories):            ${categoriesCount}`);
  console.log(`   - Nguyên liệu (ingredients):        ${ingredientsCount}`);
  console.log(`   - Đổi nguyên liệu (alternatives):   ${swapsCount[0]?.count ?? 0}`);
  console.log(`   - Người dùng (users):               ${usersCount}`);
  console.log(`   - Bài đăng cộng đồng (posts):       ${postsCount}`);
  console.log(`   - Công thức nấu ăn (recipes):       ${recipesCount}`);
  console.log(`   - Kế hoạch tuần (meal_plans):       ${mealPlansCount} (với ${mealPlanDetailsCount} chi tiết bữa ăn)`);
  console.log(`   - Nhật ký ăn uống (food_diaries):   ${foodDiariesCount}`);
  console.log(`   - Nhà hàng chay (restaurants):      ${restaurantsCount}`);
  console.log('----------------------------------------------------');

  // Xác thực mật khẩu tài khoản mẫu
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@swp391.com' } });
  const normalUser = await prisma.user.findUnique({ where: { email: 'user@swp391.com' } });
  const adminPassMatch = adminUser && (await bcrypt.compare('123456', adminUser.password_hash));
  const userPassMatch = normalUser && (await bcrypt.compare('123456', normalUser.password_hash));

  if (!adminPassMatch || !userPassMatch) {
    throw new Error('Cảnh báo: Mật khẩu của tài khoản mẫu admin hoặc user không khớp.');
  }

  console.log('🔑 Tài khoản mẫu đã xác thực sẵn sàng đăng nhập:');
  console.log('   - Admin: admin@swp391.com      | Mật khẩu: 123456 (Role: 1, ACTIVE)');
  console.log('   - User:  user@swp391.com       | Mật khẩu: 123456 (Role: 2, ACTIVE)');
  console.log('   - User:  lan.nguyen@swp391.com | Mật khẩu: 123456 (Role: 2, ACTIVE)');
  console.log('----------------------------------------------------');
  console.log('🎉 Toàn bộ cơ sở dữ liệu đã sẵn sàng cho ứng dụng ChayXanh!');
}

main()
  .catch((err) => {
    console.error('❌ Lỗi khi import dữ liệu mẫu:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
