import cspell from '@build/cspell-config';
const config = {
  ...cspell,
  ignorePaths: [...cspell.ignorePaths, '*.config.js'],
};
export default config;
