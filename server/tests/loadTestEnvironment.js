// d:\Projects\FPT\SWP391\server\tests/loadTestEnvironment.js
// Nạp biến môi trường cho bộ test từ .env.test và chặn chạy test trên DB thật.
// Mọi file test tích hợp phải import file này đầu tiên.
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env.test', import.meta.url), override: true, quiet: true });
// Bắt buộc tên database kết thúc bằng "_test" để test (có xóa/ghi dữ liệu) không bao giờ chạm vào DB phát triển hay production.
const databaseUrl = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
if (!databaseUrl.pathname.endsWith('_test')) throw new Error('Tests require .env.test and a separate database ending in _test.');
process.env.NODE_ENV = 'test';
// File .env của lập trình viên không được bật kiểm duyệt nội dung cho các bộ test không liên quan; test kiểm duyệt tự bật khi cần.
process.env.CONTENT_MODERATION_ENABLED ??= 'false';
