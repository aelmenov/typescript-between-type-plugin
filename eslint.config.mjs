import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['lib/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['lib.between.d.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-loss-of-precision': 'off',
    },
  },
  { files: ['**/*.mjs'], languageOptions: { sourceType: 'module' } },
];
