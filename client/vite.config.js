// D:/SWP391/SWP391/client/vite.config.js
// Cấu hình Vite cho client: plugin React và proxy /api, /uploads sang Back-end ở cổng 5000.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// FE chỉ gọi BE; khóa nội bộ và việc gọi AI thuộc trách nhiệm của BE.
const proxy = {
  '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
  '/uploads': { target: 'http://127.0.0.1:5000', changeOrigin: true },
};

// Tài liệu cấu hình: https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
});
