import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import { configs, plugins } from 'eslint-config-airbnb-extended';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['lib/**', '.codex/**']),
  js.configs.recommended,
  plugins.stylistic,
  plugins.importX,
  plugins.typescriptEslint,
  ...configs.base.all,
  tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.nodeBuiltin,
      parserOptions: {
        projectService: false,
        project: ['./tsconfig.json', './tsconfig.tests.json', './tsconfig.configs.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'import-x/extensions': [
        'error',
        'ignorePackages',
        { js: 'always', mjs: 'always', ts: 'never' },
      ],
      'import-x/prefer-default-export': 'off',
      'no-continue': 'off',
      '@stylistic/lines-between-class-members': [
        'error',
        'always',
        { exceptAfterSingleLine: true },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForInStatement',
          message: 'Use Object.keys or Object.entries to iterate properties.',
        },
        { selector: 'LabeledStatement', message: 'Use structured control flow instead of labels.' },
        { selector: 'WithStatement', message: 'With statements make variable scope ambiguous.' },
      ],
    },
  },
  {
    files: ['src/analysis/**/*.ts'],
    rules: { 'no-bitwise': 'off' },
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: { globals: globals.jest },
  },
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  },
  {
    files: ['lib.between.d.ts'],
    languageOptions: { parserOptions: { project: null } },
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      '@typescript-eslint/no-unused-vars': 'off',
      'no-loss-of-precision': 'off',
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.nodeBuiltin,
    },
  },
  prettier,
);
