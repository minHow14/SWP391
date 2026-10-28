// D:/SWP391/SWP391/client/vitest.config.js
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({ plugins: [react()], test: {
  environment: 'jsdom', include: ['test/videoRecipeSummary*.test.jsx'], restoreMocks: true,
} });
