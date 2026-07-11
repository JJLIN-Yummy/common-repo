/** @type {import('vite').UserConfig} */
import { defineConfig, loadEnv, mergeConfig } from 'vite';
import baseConfig from '../../vite.config.base';

import path from 'path';
import { pathMap, wrapperEnv } from '../../build/utils';
import { createVitePlugins } from './build/plugin';
import type { ViteEnv } from './types';
import type { ModuleInfo } from 'rollup';

// install vitest @vitejs/plugin-vue vue-b-/utils @vitest/coverage-v8 --save-dev
export default defineConfig((option) => {
  const { mode } = option;
  const root = process.cwd();
  const env = loadEnv(mode, root);
  const viteEnv = wrapperEnv<ViteEnv>(env);
  const { VITE_PUBLIC_PATH } = viteEnv;
  return {
    ...mergeConfig(baseConfig(option), {
      base: VITE_PUBLIC_PATH,
      resolve: {
        alias: [
          {
            find: '@',
            replacement: path.resolve('./src/'),
          },
          {
            find: '#',
            replacement: path.resolve('./types/'),
          },
        ],
      },
      plugins: createVitePlugins(),
      build: {
        chunkSizeWarningLimit: 500,

        rollupOptions: {
          input: {
            main: path.resolve(pathMap.root, 'index.html'),
            // nested: path.resolve(pathMap.root,'src/pages/nested/index.html'),
          },
          // plugins: [visualizer({ open: true })] // 打包后自动打开可视化报告
          output: {
            // experimentalMinChunkSize: 200 * 1024,
            manualChunks(
              id: string,
              _meta: {
                getModuleInfo: (mid: string) => ModuleInfo | null;
                getModuleIds: () => IterableIterator<string>;
              }
            ) {
              // if(id.includes('src/utils')){
              //     return 'utils'; //合包
              // }
              if (id.includes('vue-router/') && id.includes('node_modules')) {
                console.log(id);

                return 'vendor-vueRouter';
              }
              if (id.includes('vue/') && id.includes('node_modules')) {
                console.log(id);

                return 'vendor-vue';
              }

              return undefined;
            },
          },
        },
      },
      test: {
        // 模拟浏览器环境
        environment: 'jsdom',
        // 支持 Vue 单文件组件
        transformMode: {
          web: [/.[tj]sx$/],
        },
        globals: true,
        isolate: true, // 每个测试文件独立运行环境，自动隔离全局mock
        coverage: {
          provider: 'v8',
          thresholds: {
            lines: 90,
            branches: 90,
            functions: 90,
            statements: 90,
          },
          include: ['src/**/*.ts'],
          exclude: [
            'node_modules/**',
            'dist/**',
            'src/Vue_App.vue',
            'src/main.ts',
            'src/__tests__/**',
          ],
        },
      },
    }),
  };
});
