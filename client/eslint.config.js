// D:/SWP391/SWP391/client/eslint.config.js
// Cấu hình ESLint (flat config) cho client: quy tắc JS chuẩn, React Hooks và React Refresh.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Bỏ qua thư mục build để không lint mã đã được bundle.
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    // Tắt quy tắc set-state-in-effect vì nhiều hook cố ý đồng bộ state từ props/dữ liệu tải về trong effect.
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  // Thư mục test chạy trong Node + jsdom nên cần cả biến toàn cục của Node lẫn trình duyệt.
  {
    files: ['test/**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
])
