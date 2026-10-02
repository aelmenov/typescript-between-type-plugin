import { lintSource } from '../support/lint.util.js';
import { dedent } from '../support/source.util.js';

describe('Generic range aliases', () => {
  it('keeps each substituted bound separate when the same alias is used repeatedly', async () => {
    const code = dedent(`
      type Positive<Max extends number> = Between<0, Max>;

      const narrow: Positive<5> = 6;
      const wide: Positive<10> = 6;
      const narrowAgain: Positive<5> = 6;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([
      { messageId: 'outOfRange', line: 3 },
      { messageId: 'outOfRange', line: 5 },
    ]);
  });

  it('substitutes a supplied generic upper bound', async () => {
    const code = dedent(`
      type Positive<Max extends number> = Between<0, Max>;

      const value: Positive<10> = 5;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('uses a default generic upper bound', async () => {
    const code = dedent(`
      type NumericRange<Min extends number, Max extends number = 10> = Between<Min, Max>;

      const value: NumericRange<0> = 5;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('resolves a generic range through another alias', async () => {
    const code = dedent(`
      type NumericRange<Max extends number> = Between<0, Max>;
      type Channel = NumericRange<255>;

      const value: Channel = 5;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('rejects a value above a supplied generic bound', async () => {
    const code = dedent(`
      type Positive<Max extends number> = Between<0, Max>;

      const value: Positive<10> = 11;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks a substituted generic range through an alias chain', async () => {
    const code = dedent(`
      type NumericRange<Max extends number> = Between<0, Max>;
      type Channel = NumericRange<255>;

      const value: Channel = 256;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks a generic alias even when its type argument is unused', async () => {
    const code = dedent(`
      type UnitRange<Unused> = Between<0, 1>;

      const value: UnitRange<number> = 100;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks an alias whose unused type parameter has a default', async () => {
    const code = dedent(`
      type UnitRange<Unused = number> = Between<0, 1>;

      const value: UnitRange = 100;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });
});
