import { lintSource } from '../support/lint.util.js';
import { dedent } from '../support/source.util.js';

describe('Local aliases and range unions', () => {
  it('accepts a numeric type alias as a range bound', async () => {
    const code = dedent(`
      type End = 255;

      const value: Between<0, End> = 5;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('allows a fractional value through a local alias', async () => {
    const code = dedent(`
      type Byte = Between<0, 255>;

      const value: Byte = 128.5;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('resolves an alias declared later in the file', async () => {
    const code = dedent(`
      type Channel = Byte;
      type Byte = Between<0, 255>;

      const value: Channel = 255;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('accepts a value in the second member of a named range union', async () => {
    const code = dedent(`
      type Low = Between<1, 10>;
      type Choice = Low | Between<20, 30>;

      const value: Choice = 25;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('accepts repeated members of a range union', async () => {
    const code = dedent(`
      type Low = Between<1, 10>;
      type RepeatedLow = Low | Low;

      const value: RepeatedLow = 5;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('accepts a value in either member of an inline range union', async () => {
    const code = 'const value: Between<1, 10> | Between<20, 30> = 25;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('allows unrestricted values when a range is unioned with number', async () => {
    const code = 'const value: Between<1, 10> | number = 100;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('rejects arithmetic whose result falls in a gap between range union members', async () => {
    const code = dedent(`
      type Choice = Between<0, 10> | Between<20, 30>;

      const value: Choice = 10 + 5;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks a locally declared Byte alias', async () => {
    const code = dedent(`
      type Byte = Between<0, 255>;

      const value: Byte = 256;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks a forward alias chain against its final range', async () => {
    const code = dedent(`
      type Channel = Byte;
      type Byte = Between<0, 255>;

      const value: Channel = -1;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a value in the gap of a named range union', async () => {
    const code = dedent(`
      type Low = Between<1, 10>;
      type Choice = Low | Between<20, 30>;

      const value: Choice = 15;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('does not widen a union just because its members are repeated', async () => {
    const code = dedent(`
      type Low = Between<1, 10>;
      type RepeatedLow = Low | Low;

      const value: RepeatedLow = 15;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks a built in range through a local alias', async () => {
    const code = dedent(`
      type Channel = Byte;

      const value: Channel = -1;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a value outside every built in union member', async () => {
    const code = 'const value: Byte | Short = 40000;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a value in the gap of an inline range union', async () => {
    const code = 'const value: Between<1, 10> | Between<20, 30> = 15;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a value below all members of a range union', async () => {
    const code = 'const value: Between<1, 10> | Between<20, 30> = 0;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });
});
