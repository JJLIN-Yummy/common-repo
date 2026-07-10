import es from '@build/eslint-config';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['node_modules/**', 'vite.config*.ts', 'test*.ts', 'build/**', '*.config.ts'],
  },
  ...es,
  ...tseslint.configs.recommended,
  // 子包内类型解析：只匹配当前子包src
  {
    files: ['src/**/*.{ts,tsx,mts,cts}'], // 子包内不用写 ./，默认当前packages/tools目录
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
      },
    },
  },
  // 子包规则块放最后，保证最高优先级覆盖上层所有规则
  {
    files: ['src/**/*.{js,ts,tsx,mts,cts,vue}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
];
