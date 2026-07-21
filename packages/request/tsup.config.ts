import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2020',
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  external: [
    'axios',
    // ✅ 新增：node原生内置模块全部external
    'util',
    'path',
    'fs',
    'stream',
    'events',
    'url',
    'http',
    'https',
    'os',
    'buffer',
    'child_process',
  ],
  tsconfig: './tsconfig.build.json',
});
