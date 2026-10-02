import { lintSource } from '../support/lint.util.js';
import { dedent } from '../support/source.util.js';

describe('Function scopes and repeated analysis', () => {
  it('checks nested returns against separate contracts and reports their original locations', async () => {
    const code = dedent(`
      function outer(): Byte {
        function inner(): Between<-1, 1> {
          return 2;
        }

        return 256;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([
      { messageId: 'outOfRange', line: 3, column: 12 },
      { messageId: 'outOfRange', line: 6, column: 10 },
    ]);
  });

  it('restores the outer generic bound after checking a nested function', async () => {
    const code = dedent(`
      function outer<Max extends 10>(value: Between<0, Max>): Byte {
        function inner(): Between<-1, 1> {
          return -1;
        }

        return value;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('restores the contextual callback parameter after checking a nested arrow', async () => {
    const code = dedent(`
      const callback: (value: Byte) => Byte = value => {
        const inner = (): Between<-1, 1> => 0;

        return value;
      };
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('does not leak generic bindings into the next contextual callback in the same file', async () => {
    const code = dedent(`
      function outer<Max extends 10>(value: Between<0, Max>): Byte {
        function inner(): Between<-1, 1> {
          return -1;
        }

        return value;
      }

      const callback: (value: Byte) => Byte = value => {
        const inner = (): Between<-1, 1> => 0;

        return value;
      };
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('uses the same inferred return range for every call', async () => {
    const code = dedent(`
      function readValue() {
        return 300;
      }

      const first: Byte = readValue();
      const second: Byte = readValue();
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([
      { messageId: 'outOfRange', line: 5 },
      { messageId: 'outOfRange', line: 6 },
    ]);
  });

  it('reports an explicit arrow return once when the contextual contract checks it again', async () => {
    const code = 'const callback: () => Byte = (): Byte => 256;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange', column: 42, endColumn: 45 }]);
  });
});
