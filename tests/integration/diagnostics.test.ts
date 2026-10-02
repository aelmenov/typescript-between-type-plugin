import { lintSource } from '../support/lint.util.js';

describe('Diagnostic messages and source locations', () => {
  it('reports the evaluated value and the exact arithmetic expression location', async () => {
    const code = 'const a: Byte = 250 + 10;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([
      {
        messageId: 'outOfRange',
        column: 17,
        endColumn: 25,
        message: 'Value 260 is outside the allowed range Between<0, 255>.',
        ruleId: 'between/within-range',
        severity: 2,
        line: 1,
        endLine: 1,
      },
    ]);
  });

  it('reports the required range and the exact literal location', async () => {
    const code = 'const a: Between<0, 10> = 11;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([
      {
        messageId: 'outOfRange',
        column: 27,
        endColumn: 29,
        message: 'Value 11 is outside the allowed range Between<0, 10>.',
        ruleId: 'between/within-range',
        severity: 2,
        line: 1,
        endLine: 1,
      },
    ]);
  });
});
