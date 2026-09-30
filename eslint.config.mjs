import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['lib/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['**/*.mjs'], languageOptions: { sourceType: 'module' } },
];
