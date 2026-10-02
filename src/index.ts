import type { TSESLint } from '@typescript-eslint/utils';
import { pluginMeta } from './plugin.constants.js';
import withinRange from './rules/within-range.js';

const configs: Record<string, TSESLint.FlatConfig.Config> = {};

const plugin = {
  meta: pluginMeta,
  rules: { 'within-range': withinRange },
  configs,
};

plugin.configs.recommended = {
  name: 'between/recommended',
  plugins: { between: plugin },
  rules: { 'between/within-range': 'error' },
};

export default plugin;
