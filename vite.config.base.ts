/** @type {import('vite').UserConfig} */
import { defineConfig, mergeConfig } from 'vite';
import { baseConfig } from '@build/vite-config';

// install vitest @vitejs/plugin-vue vue-b-/utils @vitest/coverage-v8 --save-dev
export default defineConfig((option) => {
  // const { mode} = option;
  // const root = process.cwd();
  // const env = loadEnv(mode, root);
  const base = baseConfig(option);
  return {
    ...mergeConfig(base, {}),
  };
});
