// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@common': resolve(__dirname, 'src/common'),
    },
  },
  test: {
    environment: 'jsdom', // 或 'happy-dom'（更快，但 API 少）
    globals: true,
    include: ['src/classes/scheduler/**/*.{test,spec}.ts'],
  },
});
