import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Express (đăng nhập, dữ liệu, tìm quán) và dịch vụ AI (FastAPI: chatbot, thực đơn, quản trị AI).
// Trình duyệt chỉ gọi cùng origin: /api -> Express, /ai-api -> dịch vụ AI (đổi /ai-api thành /api).
const proxy = {
  '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
  '/ai-api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/ai-api/, '/api'),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
})
