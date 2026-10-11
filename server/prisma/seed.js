import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../src/config/prisma.js';

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
      timeout: 30000, // 30s timeout cho tác vụ seed toàn bộ bảng
    }
  );

  console.log('✅ Import dữ liệu mẫu vào PostgreSQL thành công!');
  console.log('----------------------------------------------------');
  console.log('📋 Thống kê số lượng dữ liệu đã nạp:');
  const [usersCount, postsCount, recipesCount, restaurantsCount] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.recipe.count(),
    prisma.restaurant.count(),
  ]);

  console.log(`   - Người dùng (users):       ${usersCount}`);
  console.log(`   - Bài đăng (posts):          ${postsCount}`);
  console.log(`   - Công thức (recipes):       ${recipesCount}`);
  console.log(`   - Nhà hàng chay (restaurants): ${restaurantsCount}`);
  console.log('----------------------------------------------------');
  console.log('🔑 Tài khoản mẫu:');
  console.log('   - Admin: admin@swp391.com    | Mật khẩu: 123456');
  console.log('   - User:  user@swp391.com     | Mật khẩu: 123456');
  console.log('   - User:  lan.nguyen@swp391.com | Mật khẩu: 123456');
  console.log('----------------------------------------------------');
}

main()
  .catch((err) => {
    console.error('❌ Lỗi khi import dữ liệu mẫu:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

