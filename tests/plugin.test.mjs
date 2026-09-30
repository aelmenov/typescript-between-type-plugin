import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import parser from '@typescript-eslint/parser';
import plugin from 'eslint-plugin-between';

test('recommended flat config works through the ESLint API', async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [{
      ...plugin.configs.recommended,
      files: ['**/*.ts'],
      languageOptions: { parser },
    }],
  });
  const [invalid] = await eslint.lintText('const a: Between<1, 10> = 0;', { filePath: 'input.ts' });
  assert.equal(invalid.errorCount, 1);
  assert.equal(invalid.messages[0].ruleId, 'between/within-range');
  const [valid] = await eslint.lintText('const a: Between<1, 10> = 5;', { filePath: 'input.ts' });
  assert.equal(valid.errorCount, 0);
});
