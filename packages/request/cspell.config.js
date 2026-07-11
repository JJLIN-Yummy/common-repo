import cspell from '@build/cspell-config';
const config = {
  ...cspell,
  ignorePaths: [...cspell.ignorePaths, '*.config.js', 'coverage', '*.config.ts'],
};
export default config;
