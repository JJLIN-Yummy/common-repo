import es from '@build/eslint-config';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['node_modules/**', 'vite.config*.ts', 'test*.ts', 'build/**', 'dist/**'],
  },
  ...es,
  ...tseslint.configs.recommended,
  // 子包内类型解析：只匹配当前子包src
  {
    files: ['src/**/*.{ts,tsx,mts,cts}', 'types/**/*.{ts,tsx,mts,cts}'], // 子包内不用写 ./，默认当前packages/tools目录
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
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/unbound-method': 'off',
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
