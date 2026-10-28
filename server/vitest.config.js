// d:\Projects\FPT\SWP391\server\vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
    setupFiles: ['./tests/loadTestEnvironment.js'],
  },
});
