import { lintSource } from '../support/lint.util.js';
import { dedent } from '../support/source.util.js';

describe('Function parameters and return contracts', () => {
  it('checks values passed through a spread argument', async () => {
    const code = dedent(`
      function convert(...input: Byte[]) {}

      convert(...[1, 2]);
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('accepts arguments and returns within an explicit function contract', async () => {
    const code = dedent(`
      function convert(input: Byte): Byte {
        return input;
      }

      const channel: Byte = convert(10);
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('uses parameter and return annotations on an arrow function', async () => {
    const code = dedent(`
      const convert = (input: Byte): Byte => input;

      const channel: Byte = convert(10);
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('uses the contextual parameter and return types of a callback', async () => {
    const code = 'const convert: (input: Byte) => Byte = (input) => input;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('infers a constant return value from an unannotated function', async () => {
    const code = dedent(`
      function convert() {
        return 10;
      }

      const channel: Byte = convert();
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('accepts each value of a range typed rest parameter', async () => {
    const code = dedent(`
      function convert(...channels: Byte[]) {}

      convert(1, 2, 3);
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('rejects an argument outside a contextual callback contract', async () => {
    const code = dedent(`
      const convert: (input: Byte) => Byte = (input) => input;

      convert(256);
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks the contextual return type of an object method', async () => {
    const code = 'const callbacks: { convert: () => Byte } = { convert: () => 256 };';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a getter return outside its declared range', async () => {
    const code = dedent(`
      class ChannelHolder {
        get value(): Byte {
          return 256;
        }
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('reports an unknown return when a function can fall through', async () => {
    const code = dedent(`
      function convert(): Byte {
        if (flag) return 1;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });

  it('reports a possible violation when returning a wider declared interval', async () => {
    const code = dedent(`
      function convert(input: Short): Byte {
        return input;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'possibleOutOfRange' }]);
  });

  it('reports an unknown return for an unrestricted number', async () => {
    const code = dedent(`
      function convert(input: number): Byte {
        return input;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });

  it('rejects an argument outside an explicit parameter contract', async () => {
    const code = dedent(`
      function convert(input: Byte) {}

      convert(256);
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a return outside an explicit function contract', async () => {
    const code = dedent(`
      function convert(): Byte {
        return 256;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects an arrow return outside its contextual contract', async () => {
    const code = 'const convert: () => Byte = () => 256;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects an inferred return value that exceeds the receiving range', async () => {
    const code = dedent(`
      function convert() {
        return 300;
      }

      const channel: Byte = convert();
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects any out of range value in a rest argument list', async () => {
    const code = dedent(`
      function convert(...channels: Byte[]) {}

      convert(1, 256);
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });
});
