import { lintSource } from '../support/lint.util.js';
import { dedent } from '../support/source.util.js';

describe('Object and class property contracts', () => {
  it('allows an optional range property to be omitted', async () => {
    const code = 'const value: { red?: Byte } = {};';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('accepts interface properties whose values satisfy their ranges', async () => {
    const code = dedent(`
      interface Color {
        red: Byte;
        green: Byte;
      }

      const color: Color = { red: 10, green: 20 };
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('checks class initializers and constructor assignments', async () => {
    const code = dedent(`
      class ChannelHolder {
        value: Byte = 1;

        constructor(value: Byte) {
          this.value = value;
        }
      }

      const instance = new ChannelHolder(5);
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('preserves a property range through object destructuring', async () => {
    const code = dedent(`
      const pair: { value: Byte } = { value: 10 };

      const { value } = pair;

      const sample: Byte = value;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('checks writes to class properties after construction', async () => {
    const code = dedent(`
      class ChannelHolder {
        value: Byte = 0;
      }

      const instance = new ChannelHolder();

      instance.value = 256;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('invalidates a property value after passing its object to an external call', async () => {
    const code = dedent(`
      const sample: { value: Byte } = { value: 1 };

      external(sample);

      const channel: Byte = sample.value;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });

  it('rejects an interface property initializer outside its range', async () => {
    const code = dedent(`
      interface Color {
        red: Byte;
      }

      const color: Color = { red: 256 };
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a property reassignment outside its range', async () => {
    const code = dedent(`
      const color: { red: Byte } = { red: 1 };

      color.red = 256;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks range contracts inside nested object initializers', async () => {
    const code = 'const color: { nested: { red: Byte } } = { nested: { red: 256 } };';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a class property initializer outside its range', async () => {
    const code = dedent(`
      class ChannelHolder {
        value: Byte = 256;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a constructor argument outside its parameter range', async () => {
    const code = dedent(`
      class ChannelHolder {
        constructor(value: Byte) {}
      }

      new ChannelHolder(256);
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });
});
