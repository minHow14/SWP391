// client/vite.config.js
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// FE chỉ gọi BE; khóa nội bộ và việc gọi AI thuộc trách nhiệm của BE.
const proxy = {
  '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
  '/uploads': { target: 'http://127.0.0.1:5000', changeOrigin: true },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
});
