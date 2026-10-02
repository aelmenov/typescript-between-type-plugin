import { lintSource } from '../support/lint.util.js';
import { dedent } from '../support/source.util.js';

describe('Lexical scope and built in type names', () => {
  it('uses a local Byte alias instead of the built in range', async () => {
    const code = dedent(`
      type Byte = Between<0, 500>;

      const value: Byte = 300;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('allows a local number alias to shadow the built in Byte range', async () => {
    const code = dedent(`
      type Byte = number;

      const value: Byte = 300;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('does not use a built in range for an unresolved imported type with the same name', async () => {
    const code = dedent(`
      import type { Byte } from 'other';

      const value: Byte = 300;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('does not use a built in range for an interface with the same name', async () => {
    const code = dedent(`
      interface Byte {}

      const value: Byte = 300;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('does not use a built in range for a generic parameter with the same name', async () => {
    const code = dedent(`
      function assignLocal<Byte>() {
        const value: Byte = 300;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('resolves the alias in the current block', async () => {
    const code = dedent(`
      type ScopedRange = Between<0, 1>;

      {
        type ScopedRange = number;
        const value: ScopedRange = 100;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('does not mistake an inherited object property name for a built in range', async () => {
    const code = 'const value: constructor = 100;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('keeps a shadowing local variable separate from the outer range variable', async () => {
    const code = dedent(`
      let value: Between<1, 10> = 5;

      function assignLocal() {
        let value = 0;
        value = 100;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('keeps a shadowing parameter separate from the outer range variable', async () => {
    const code = dedent(`
      let value: Between<1, 10> = 5;

      function assignLocal(value: number) {
        value = 100;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('does not impose a range on ordinary number variables', async () => {
    const code = dedent(`
      let value: number = 5;

      value = 100;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('does not impose a range on an unannotated constant', async () => {
    const code = 'const value = 100;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('resolves a referenced alias in its declaration scope', async () => {
    const code = dedent(`
      type ScopedRange = Between<0, 1>;
      type RangeAlias = ScopedRange;

      {
        type ScopedRange = Between<0, 100>;
        const value: RangeAlias = 50;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('uses a narrower alias declared in the current block', async () => {
    const code = dedent(`
      type ScopedRange = Between<0, 100>;

      {
        type ScopedRange = Between<0, 1>;
        const value: ScopedRange = 50;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('keeps type aliases separate from same named values', async () => {
    const code = dedent(`
      type ScopedRange = Between<0, 1>;

      {
        const ScopedRange = 1;
        const value: ScopedRange = 50;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('keeps an outer variable contract when its type name is shadowed later', async () => {
    const code = dedent(`
      type ScopedRange = Between<0, 1>;

      let value: ScopedRange = 0;

      {
        type ScopedRange = number;
        value = 50;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('keeps the built in type range when a same named constant exists', async () => {
    const code = dedent(`
      const Byte = 1;

      const value: Byte = 256;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks an assignment to a captured outer range variable', async () => {
    const code = dedent(`
      let value: Between<1, 10> = 5;

      function assignLocal() {
        value = 100;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });
});
