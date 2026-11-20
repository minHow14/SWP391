// d:\Projects\FPT\SWP391\server\prisma\seed.js
// Script nạp dữ liệu ban đầu: chạy seed.sql trong một transaction, sửa chi tiết nguyên liệu, nạp ảnh nguyên liệu
// rồi in thống kê và kiểm tra mật khẩu các tài khoản mẫu.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/prisma.js';
import { repairIngredientDetails } from '../scripts/repair-ingredients.js';
import { importIngredientImages } from '../scripts/import-ingredient-images.js';

// ESM không có sẵn __dirname nên phải tự suy ra từ import.meta.url.
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

    // Bỏ qua mọi ký tự trong comment dòng cho tới khi xuống dòng.
    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    // Bỏ qua comment khối cho tới khi gặp ký tự đóng.
    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    // Trong chuỗi SQL, hai dấu nháy đơn liên tiếp là ký tự nháy đã escape, không phải kết thúc chuỗi.
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

    // Gặp dấu chấm phẩy ngoài chuỗi/comment thì kết thúc một câu lệnh; bỏ BEGIN/COMMIT vì đã có $transaction của Prisma bao ngoài.
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

  // Câu lệnh cuối có thể không kết thúc bằng dấu chấm phẩy.
  const trimmed = current.trim();
  if (trimmed && trimmed.toUpperCase() !== 'BEGIN' && trimmed.toUpperCase() !== 'COMMIT') {
    statements.push(trimmed);
  }

  return statements;
}

// Hàm chính của quy trình seed: nạp SQL, hậu xử lý nguyên liệu và xác thực dữ liệu sau khi nạp.
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
  // Ảnh nguyên liệu không bắt buộc nên lỗi nạp ảnh chỉ cảnh báo, không làm hỏng toàn bộ quá trình seed.
  try {
    await importIngredientImages();
  } catch (imageErr) {
    console.warn('⚠️ Cảnh báo khi nạp ảnh nguyên liệu:', imageErr.message);
  }
  console.log('✅ Import dữ liệu thực tế vào PostgreSQL thành công!');
  console.log('----------------------------------------------------');
  console.log('📋 Thống kê số lượng dữ liệu đã nạp & xác thực:');

  // Đếm số bản ghi các bảng chính để xác nhận dữ liệu đã nạp đủ.
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
    commentsCount,
    reportsCount,
    reviewsCount,
    notificationsCount,
    aiLogsCount,
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
    // Bảng ingredient_alternatives được truy vấn thô vì không cần dùng client model ở đây.
    prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM ingredient_alternatives`,
    prisma.comment.count(),
    prisma.report.count(),
    prisma.restaurantReview.count(),
    prisma.notification.count(),
    prisma.aiLog.count(),
  ]);

  console.log(`   - Chế độ ăn (diet_types):           ${dietTypesCount}`);
  console.log(`   - Danh mục (categories):            ${categoriesCount}`);
  console.log(`   - Nguyên liệu (ingredients):        ${ingredientsCount}`);
  console.log(`   - Đổi nguyên liệu (alternatives):   ${swapsCount[0]?.count ?? 0}`);
  console.log(`   - Người dùng (users):               ${usersCount}`);
  console.log(`   - Bài đăng cộng đồng (posts):       ${postsCount}`);
  console.log(`   - Bình luận (comments):             ${commentsCount}`);
  console.log(`   - Báo cáo vi phạm (reports):        ${reportsCount}`);
  console.log(`   - Công thức nấu ăn (recipes):       ${recipesCount}`);
  console.log(`   - Kế hoạch tuần (meal_plans):       ${mealPlansCount} (với ${mealPlanDetailsCount} chi tiết bữa ăn)`);
  console.log(`   - Nhật ký ăn uống (food_diaries):   ${foodDiariesCount}`);
  console.log(`   - Nhà hàng chay (restaurants):      ${restaurantsCount}`);
  console.log(`   - Đánh giá nhà hàng (reviews):      ${reviewsCount}`);
  console.log(`   - Thông báo hệ thống:               ${notificationsCount}`);
  console.log(`   - Nhật ký giám sát AI (ai_logs):    ${aiLogsCount}`);
  console.log('----------------------------------------------------');

  // Đảm bảo hash mật khẩu trong seed.sql khớp với mật khẩu tài liệu hoá, tránh tài khoản mẫu không đăng nhập được.
  // Xác thực mật khẩu tài khoản mẫu
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@swp391.com' } });
  const normalUser = await prisma.user.findUnique({ where: { email: 'user@swp391.com' } });
  const adminPassMatch = adminUser && (await bcrypt.compare('123456', adminUser.password_hash));
  const userPassMatch = normalUser && (await bcrypt.compare('123456', normalUser.password_hash));

  if (!adminPassMatch || !userPassMatch) {
    throw new Error('Cảnh báo: Mật khẩu của tài khoản mẫu admin hoặc user không khớp.');
  }

  console.log('🔑 Tài khoản mẫu đã xác thực sẵn sàng đăng nhập (Mật khẩu chung: 123456):');
  console.log('   - Admin:      admin@swp391.com      | Quản Trị Viên (Role 1, ACTIVE)');
  console.log('   - User:       user@swp391.com       | Trần Minh Quân (Role 2, ACTIVE - Thuần chay)');
  console.log('   - User:       lan.nguyen@swp391.com | Nguyễn Mai Lan (Role 2, ACTIVE - Lacto-Ovo)');
  console.log('   - User:       hoang.nam@swp391.com  | Lê Hoàng Nam (Role 2, ACTIVE - Đầu bếp video)');
  console.log('   - User:       thuy.duong@swp391.com | Phạm Thùy Dương (Role 2, ACTIVE - Eat Clean)');
  console.log('   - User:       duc.huy@swp391.com    | Vũ Đức Huy (Role 2, ACTIVE - Chay Phật giáo)');
  console.log('   - User:       quynh.anh@swp391.com  | Đặng Quỳnh Anh (Role 2, ACTIVE - Keto Chay)');
  console.log('   - User Khóa:  minh.tri@swp391.com   | Bùi Minh Trí (Role 2, LOCKED - Test quản trị)');
  console.log('   - User Xóa:   ngoc.hoa@swp391.com   | Hoàng Ngọc Hoa (Role 2, DELETED - Test khôi phục)');
  console.log('----------------------------------------------------');
  console.log('🎉 Toàn bộ cơ sở dữ liệu đã sẵn sàng cho ứng dụng ChayXanh!');
}

// Lỗi thì thoát với mã 1 để lệnh seed báo thất bại; luôn ngắt kết nối Prisma khi kết thúc.
main()
  .catch((err) => {
    console.error('❌ Lỗi khi import dữ liệu mẫu:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
