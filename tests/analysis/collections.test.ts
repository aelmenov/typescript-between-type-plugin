import { lintSource } from '../support/lint.util.js';
import { dedent } from '../support/source.util.js';

describe('Arrays, tuples, and records', () => {
  it('accepts fractional array elements and a write at the upper bound', async () => {
    const code = dedent(`
      const values: Byte[] = [1, 2, 128.5];

      values[0] = 255;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('checks each tuple position against its own range', async () => {
    const code = 'const values: [Byte, Short] = [255, -32768];';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('checks values pushed into a generic Array', async () => {
    const code = dedent(`
      const values: Array<Byte> = [1, 2];

      values.push(3);
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('accepts record values within the index signature range', async () => {
    const code = 'const values: Record<string, Byte> = { first: 1, second: 255 };';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('preserves the element range inside a for of loop', async () => {
    const code = dedent(`
      const channels: Byte[] = [1, 2];

      for (const element of channels) {
        const channel: Byte = element;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('reports that an array length can exceed Byte even when its elements cannot', async () => {
    const code = dedent(`
      function f(channels: Byte[]) {
        const length: Byte = channels.length;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'possibleOutOfRange' }]);
  });

  it('checks every possible target of a dynamic tuple index', async () => {
    const code = dedent(`
      const values: [Byte, Short] = [0, 0];

      values[i] = 300;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects an array initializer containing an out of range element', async () => {
    const code = 'const values: Byte[] = [1, 256];';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects an indexed write outside the array element range', async () => {
    const code = dedent(`
      const values: Byte[] = [1];

      values[0] = 256;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a tuple initializer that violates one position', async () => {
    const code = 'const values: [Byte, Short] = [256, 0];';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects an out of range value passed to push', async () => {
    const code = dedent(`
      const values: Byte[] = [];

      values.push(256);
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects an out of range value inserted with splice', async () => {
    const code = dedent(`
      const values: Byte[] = [];

      values.splice(0, 0, 256);
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a record value outside its index signature range', async () => {
    const code = 'const values: Record<string, Byte> = { first: 256 };';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });
});
