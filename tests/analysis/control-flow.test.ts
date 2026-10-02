import { lintSource } from '../support/lint.util.js';
import { dedent } from '../support/source.util.js';

describe('Guards, branches, and loops', () => {
  it('narrows unknown values after a numeric type guard and bounds checks', async () => {
    const code = dedent(`
      function checkChannel(input: unknown) {
        if (typeof input === 'number' && input >= 0 && input <= 255) {
          const channel: Byte = input;
        }
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('excludes NaN with a finite check before a negated bounds guard', async () => {
    const code = dedent(`
      function checkChannel(input: number) {
        if (Number.isFinite(input) && !(input < 0 || input > 255)) {
          const channel: Byte = input;
        }
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('narrows a number inside an inclusive bounds guard', async () => {
    const code = dedent(`
      function checkChannel(input: number) {
        if (input >= 0 && input <= 255) {
          const channel: Byte = input;
        }
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('preserves bounds after an early return for the opposite condition', async () => {
    const code = dedent(`
      function checkChannel(input: number) {
        if (!(input >= 0 && input <= 255)) return;

        const channel: Byte = input;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('understands comparisons with the constant on the left', async () => {
    const code = dedent(`
      function checkChannel(input: number) {
        if (0 <= input && 255 >= input) {
          const channel: Byte = input;
        }
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('checks guarded returns and a valid fallback independently', async () => {
    const code = dedent(`
      function checkChannel(input: number): Byte {
        if (input >= 0 && input <= 255) return input;

        return 0;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('merges two valid branch assignments', async () => {
    const code = dedent(`
      let channel: Byte = 1;

      if (flag) channel = 2;
      else channel = 3;

      const result: Byte = channel;
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('allows a loop increment when the guard leaves room below the upper bound', async () => {
    const code = dedent(`
      let channel: Byte = 1;

      while (channel <= 100) {
        channel += 1;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('keeps NaN possible after a negated guard without a finite check', async () => {
    const code = dedent(`
      function checkChannel(input: number) {
        if (input < 0 || input > 255) return;

        const channel: Byte = input;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'possibleOutOfRange' }]);
  });

  it('does not treat ordered comparisons as proof that a string is numeric', async () => {
    const code = dedent(`
      function checkChannel(input: string) {
        if (input >= 0 && input <= 255) {
          const channel: Byte = input;
        }
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });

  it('checks assignments inside switch cases', async () => {
    const code = dedent(`
      let input: Byte = 0;

      switch (flag) {
        case 1:
          input = 256;
          break;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks assignments inside catch blocks', async () => {
    const code = dedent(`
      let input: Byte = 0;

      try {
        external();
      } catch (error) {
        input = 256;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('replaces a guarded value with the value of a later assignment', async () => {
    const code = dedent(`
      function checkChannel(input: number) {
        if (input >= 0 && input <= 255) {
          input = 500;

          const channel: Byte = input;
        }
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('does not keep a branch guard after the branches merge', async () => {
    const code = dedent(`
      function checkChannel(input: number) {
        if (input >= 0 && input <= 255) {
        }

        const channel: Byte = input;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'possibleOutOfRange' }]);
  });

  it('invalidates a narrowed mutable value after a call', async () => {
    const code = dedent(`
      function checkChannel(input: number) {
        if (input >= 0 && input <= 255) {
          mutate();

          const channel: Byte = input;
        }
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });

  it('reports possible overflow in a loop without a numeric bound', async () => {
    const code = dedent(`
      let channel: Byte = 0;

      while (flag) {
        channel++;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'possibleOutOfRange' }]);
  });

  it('reports both a bad branch assignment and its merged consequence', async () => {
    const code = dedent(`
      let channel: Byte = 1;

      if (flag) channel = 500;

      const result: Byte = channel;
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([
      { messageId: 'outOfRange' },
      { messageId: 'possibleOutOfRange' },
    ]);
  });
});
