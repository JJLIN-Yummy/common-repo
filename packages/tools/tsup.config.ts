import { defineConfig } from 'tsup';

export default defineConfig({
  // tsconfig: "./tsconfig.build.json", // 关键：不走项目通用tsconfig
  // 入口文件，多入口可填 ["src/index.ts", "src/array.ts"]
  entry: ['src/index.ts'],
  // 输出两种格式，匹配 package.json import/require
  format: ['esm', 'cjs'],
  // 生成类型声明文件
  dts: true,
  // 打包前清空dist目录
  clean: true,
  // 编译目标：同时兼容 Node16 + 现代浏览器
  target: 'ES2020',
  // 生产环境开启代码压缩
  minify: true,
  // cjs 不注入 __dirname/__filename 避免浏览器报错
  shims: false,
  // 输出目录，默认dist可省略
  outDir: 'dist',
});
