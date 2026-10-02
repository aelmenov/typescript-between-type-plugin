import { lintSource } from '../support/lint.util.js';

describe('Values without a provable numeric range', () => {
  it('reports an unknown range for the result of an external call', async () => {
    const code = 'const channel: Byte = external();';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });

  it('does not treat a type assertion as proof of an unknown value', async () => {
    const code = 'const channel: Byte = external() as Byte;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });

  it('keeps a call result unknown after adding a constant', async () => {
    const code = 'const channel: Byte = getValue() + 1000;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });

  it('does not assume an unknown value becomes numeric when multiplied by zero', async () => {
    const code = 'const channel: Byte = unknownValue * 0;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });

  it('does not interpret string concatenation as numeric addition', async () => {
    const code = "const channel: Byte = '250' + 10;";

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });

  it('does not coerce a boolean into a proven numeric range', async () => {
    const code = 'const channel: Byte = true + 300;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });

  it('does not treat bigint arithmetic as number arithmetic', async () => {
    const code = 'const channel: Byte = 250n + 10n;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });

  it('does not treat a comparison result as a numeric value', async () => {
    const code = 'const channel: Byte = 500 > 10;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });

  it('does not infer the result of a standard library call', async () => {
    const code = 'const channel: Byte = Math.pow(2, 10);';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });

  it('requires proof for a call result assigned to an explicit range', async () => {
    const code = 'const channel: Between<1, 10> = getValue();';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });
});
