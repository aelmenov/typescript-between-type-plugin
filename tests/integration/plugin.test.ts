import { readFile } from 'node:fs/promises';
import parser from '@typescript-eslint/parser';
import { TSESLint } from '@typescript-eslint/utils';
import plugin from '@elmenov-softworks/eslint-plugin-between';
import { createLinter, lintSource } from '../support/lint.util.js';
import { dedent } from '../support/source.util.js';

describe('Published plugin and recommended flat configuration', () => {
  it('exposes the published package name and version in ESLint metadata', async () => {
    const text = await readFile(new URL('../../package.json', import.meta.url), 'utf8');
    const manifest: unknown = JSON.parse(text);

    expect(manifest).toMatchObject(plugin.meta);
  });

  it('enables the rule as an ESLint error', async () => {
    const linter = createLinter();
    const code = 'const channel: Between<1, 10> = 0;';

    const [result] = await linter.lintText(code, { filePath: 'input.ts' });

    expect(result).toMatchObject({
      errorCount: 1,
      warningCount: 0,
      messages: [
        {
          ruleId: 'between/within-range',
          messageId: 'outOfRange',
          severity: 2,
        },
      ],
    });
  });

  it('accepts a value within its declared range', async () => {
    const code = 'const channel: Between<1, 10> = 5;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('ignores unknown values when explicitly configured', async () => {
    const linter = createLinter({ unknownValues: 'ignore' });
    const code = 'const channel: Byte = external();';

    const messages = await lintSource(code, linter);

    expect(messages).toEqual([]);
  });

  it('still rejects a known violation when unknown values are ignored', async () => {
    const linter = createLinter({ unknownValues: 'ignore' });
    const code = dedent(`
      const unknown: Byte = external();
      const outside: Byte = 256;
    `);

    const messages = await lintSource(code, linter);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects an unsupported option value at the ESLint configuration boundary', async () => {
    const linter = new TSESLint.ESLint({
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ['**/*.ts'],
          languageOptions: { parser },
          plugins: { between: plugin },
          rules: {
            'between/within-range': ['error', { unknownValues: 'allow' }],
          },
        },
      ],
    });
    const code = 'const channel: Byte = 0;';

    await expect(lintSource(code, linter)).rejects.toThrow(/unknownValues|allowed values/);
  });
});
