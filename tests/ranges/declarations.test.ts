import { lintSource } from '../support/lint.util.js';
import { dedent } from '../support/source.util.js';

describe('Invalid range declarations', () => {
  it('keeps recursion diagnostics for generic aliases that reuse the same body', async () => {
    const code = dedent(`
      type Identity<Value> = Value;
      type Inner = Identity<Byte>;
      type Outer = Identity<Inner>;

      const value: Outer = 256;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([
      {
        messageId: 'invalidRange',
        message: 'Invalid range declaration: Cyclic or excessively deep range type.',
      },
    ]);
  });

  it('keeps the depth limit when previously resolved aliases form a longer chain', async () => {
    const aliases = Array.from(
      { length: 105 },
      (_, index) => `type Range${index + 1} = Range${index};`,
    );
    const code = ['type Range0 = Byte;', ...aliases, 'const value: Range105 = 5;'].join('\n');

    const messages = await lintSource(code);

    expect(messages.length).toBeGreaterThan(0);
    for (const message of messages) {
      expect(message).toMatchObject({
        messageId: 'invalidRange',
        message: 'Invalid range declaration: Cyclic or excessively deep range type.',
      });
    }
  });

  it('reports cyclic aliases without failing with recursive resolution', async () => {
    const code = dedent(`
      type First = Second;
      type Second = First;

      const value: First = 1;
    `);

    const messages = await lintSource(code);

    expect(messages.length).toBeGreaterThan(0);
    for (const message of messages) {
      expect(message).toMatchObject({ messageId: 'invalidRange' });
    }
  });
  it('rejects a conditional type that cannot be resolved to a range', async () => {
    const code = dedent(`
      type ConditionalRange<Input> = Input extends string ? Byte : Short;

      const value: ConditionalRange<string> = 300;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'invalidRange' }]);
  });

  it('reports reversed bounds even when the alias is unused', async () => {
    const code = 'type InvalidRange = Between<10, 1>;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'invalidRange' }]);
  });

  it('reports an infinite bound even when the alias is unused', async () => {
    const code = 'type InvalidRange = Between<0, 1e309>;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'invalidRange' }]);
  });

  it('requires a numeric literal bound rather than the number type', async () => {
    const code = 'type InvalidRange = Between<0, number>;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'invalidRange' }]);
  });

  it('requires both range bounds', async () => {
    const code = 'type InvalidRange = Between<0>;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'invalidRange' }]);
  });

  it('rejects type arguments on a non generic built in alias', async () => {
    const code = 'const value: Byte<number> = 300;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'invalidRange' }]);
  });

  it('rejects an initializer annotated with reversed bounds', async () => {
    const code = 'const value: Between<10, 1> = 100;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'invalidRange' }]);
  });
});
