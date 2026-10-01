import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import parser from '@typescript-eslint/parser';
import plugin from 'eslint-plugin-between';

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    {
      ...plugin.configs.recommended,
      files: ['**/*.ts'],
      languageOptions: { parser },
    },
  ],
});

test('nested functions retain separate return contracts and diagnostic locations', async () => {
  const code = `
function outer(): Byte {
  function inner(): Between<-1, 1> {
    return 2;
  }

  return 256;
}`;

  const [result] = await eslint.lintText(code, { filePath: 'input.ts' });

  assert.deepEqual(
    result.messages.map(({ messageId, line, column }) => ({
      messageId,
      line,
      column,
    })),
    [
      { messageId: 'outOfRange', line: 4, column: 12 },
      { messageId: 'outOfRange', line: 7, column: 10 },
    ],
  );
});

test('nested function analysis preserves outer generic bindings and contextual parameters', async () => {
  const code = `
function outer<Max extends 10>(value: Between<0, Max>): Byte {
  function inner(): Between<-1, 1> {
    return -1;
  }

  return value;
}

const callback: (value: Byte) => Byte = value => {
  const inner = (): Between<-1, 1> => 0;

  return value;
};`;

  const [result] = await eslint.lintText(code, { filePath: 'input.ts' });

  assert.deepEqual(result.messages, []);
});

test('repeated calls use the same inferred return range', async () => {
  const code = `
function value() {
  return 300;
}

const first: Byte = value();
const second: Byte = value();`;

  const [result] = await eslint.lintText(code, { filePath: 'input.ts' });

  assert.deepEqual(
    result.messages.map(({ messageId, line }) => ({ messageId, line })),
    [
      { messageId: 'outOfRange', line: 6 },
      { messageId: 'outOfRange', line: 7 },
    ],
  );
});

test('contextual reanalysis reports a violation once at the original return value', async () => {
  const code = 'const callback: () => Byte = (): Byte => 256;';

  const [result] = await eslint.lintText(code, { filePath: 'input.ts' });

  assert.deepEqual(
    result.messages.map(({ messageId, column, endColumn }) => ({
      messageId,
      column,
      endColumn,
    })),
    [{ messageId: 'outOfRange', column: 42, endColumn: 45 }],
  );
});
