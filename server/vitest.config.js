// d:\Projects\FPT\SWP391\server\vitest.config.js
// Cấu hình Vitest cho Back-end: nạp biến môi trường test trước khi chạy.
import { defineConfig } from 'vitest/config';
import './tests/loadTestEnvironment.js';

// Tắt chạy song song giữa các file vì các bộ test dùng chung một DB test; tăng timeout cho test tích hợp với DB.
export default defineConfig({
  test: { fileParallelism: false, testTimeout: 15_000, hookTimeout: 30_000 },
});
