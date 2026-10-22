// D:/SWP391/SWP391/server/vitest.config.js
import { defineConfig } from 'vitest/config';
import './tests/loadTestEnvironment.js';

export default defineConfig({
  test: { fileParallelism: false, testTimeout: 15_000, hookTimeout: 30_000 },
});
