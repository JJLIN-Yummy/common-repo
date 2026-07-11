import cspell from '@build/cspell-config';
const config = {
  ...cspell,
  import: ['./packages/tools/cspell.config.js'],
  ignorePaths: [...cspell.ignorePaths, '*.config.js'],
};
export default config;
