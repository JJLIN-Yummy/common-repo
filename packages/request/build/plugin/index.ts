import type { PluginOption } from 'vite';
import visualizer from 'rollup-plugin-visualizer';

export function createVitePlugins(): PluginOption[] {
  // 兼容CJS默认导出
  const visualizerPlugin = (visualizer as any).default ?? visualizer;
  // 开发环境不需要体积分析，仅打包时启用
  if (process.env.NODE_ENV !== 'production') return [];
  return [
    visualizerPlugin({
      open: true,
      filename: 'stats.html',
      gzipSize: true,
    }),
  ];
}
