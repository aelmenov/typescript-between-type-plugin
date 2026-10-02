import { lintSource } from '../support/lint.util.js';
import { dedent } from '../support/source.util.js';

describe('Assignments and mutations', () => {
  it('accepts a compound power whose result stays within the range', async () => {
    const code = dedent(`
      let channel: Byte = 2;

      channel **= 7;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('propagates a constant into a later arithmetic expression', async () => {
    const code = dedent(`
      const channel = 250;

      const result: Byte = channel + 5;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('accepts a compound addition that reaches the upper bound', async () => {
    const code = dedent(`
      let channel: Byte = 250;

      channel += 5;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('tracks an increment followed by a decrement', async () => {
    const code = dedent(`
      let channel: Byte = 0;

      channel++;
      channel--;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('checks targets of array destructuring assignments', async () => {
    const code = dedent(`
      let channel: Byte = 0;

      [channel] = [256];
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks targets of object destructuring assignments', async () => {
    const code = dedent(`
      let channel: Byte = 0;

      ({ value: channel } = { value: 256 });
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('preserves the contract of a destructured variable on reassignment', async () => {
    const code = dedent(`
      let { value }: { value: Byte } = { value: 0 };

      value = 256;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a compound power that exceeds the upper bound', async () => {
    const code = dedent(`
      let channel: Byte = 2;

      channel **= 8;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('reports an out of range expression after constant propagation', async () => {
    const code = dedent(`
      const channel = 250;

      const result: Byte = channel + 10;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a compound addition beyond the upper bound', async () => {
    const code = dedent(`
      let channel: Byte = 250;

      channel += 10;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects incrementing a value already at the upper bound', async () => {
    const code = dedent(`
      let channel: Byte = 255;

      channel++;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects decrementing a value already at the lower bound', async () => {
    const code = dedent(`
      let channel: Byte = 0;

      --channel;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks a satisfies expression against its range', async () => {
    const code = 'const channel = 256 satisfies Byte;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks successive valid assignments including a fractional value', async () => {
    const code = dedent(`
      let channel: Between<-10, 10> = 5;

      channel = -10;
      channel = 2.5;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('checks arithmetic reassignment through a named built in alias', async () => {
    const code = dedent(`
      type Channel = Byte;

      let channel: Channel = 0;

      channel = 250 + 10;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('preserves a local alias contract on reassignment', async () => {
    const code = dedent(`
      type Byte = Between<0, 255>;

      let channel: Byte = 1;

      channel = 256;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks a built in range on reassignment', async () => {
    const code = dedent(`
      let channel: Byte = 0;

      channel = 256;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a reassignment below the lower bound', async () => {
    const code = dedent(`
      let channel: Between<1, 10> = 5;

      channel = 0;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('reports each invalid assignment independently', async () => {
    const code = dedent(`
      let channel: Between<-10, 10> = 5;

      channel = 11;
      channel = -11;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }, { messageId: 'outOfRange' }]);
  });
});
