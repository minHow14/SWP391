// D:/SWP391/SWP391/client/vitest.config.js
// Cấu hình Vitest: chạy test component trong môi trường jsdom, chỉ lấy file test/*.test.jsx.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// restoreMocks giúp mỗi test bắt đầu với mock sạch, tránh rò trạng thái giữa các test.
export default defineConfig({ plugins: [react()], test: {
  environment: 'jsdom', include: ['test/*.test.jsx'], restoreMocks: true,
} });
