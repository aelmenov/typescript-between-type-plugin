import { lintSource } from '../support/lint.util.js';
import { dedent } from '../support/source.util.js';

describe('Arithmetic and interval evaluation', () => {
  it('bounds multiplication across both negative and positive values', async () => {
    const code = dedent(`
      function calculate(left: Between<-5, 5>): Between<-25, 25> {
        return left * left;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('recognizes that an even power cannot be negative', async () => {
    const code = dedent(`
      function calculate(left: Between<-5, 5>): Between<0, 25> {
        return left ** 2;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('bounds division when the divisor stays above zero', async () => {
    const code = dedent(`
      function calculate(left: Between<0, 10>, right: Between<1, 2>): Between<0, 10> {
        return left / right;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('reverses interval endpoints when multiplying by a negative constant', async () => {
    const code = dedent(`
      function calculate(left: Between<-5, 5>): Between<-10, 10> {
        return left * -2;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('adds the intervals of two function parameters', async () => {
    const code = dedent(`
      function calculate(left: Between<0, 100>, right: Between<0, 100>): Byte {
        return left + right;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('evaluates a constant bit shift', async () => {
    const code = 'const value: Byte = 1 << 7;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('reports an unknown quotient when the divisor interval includes zero', async () => {
    const code = dedent(`
      function calculate(left: Between<1, 2>, right: Between<-1, 1>): Byte {
        return left / right;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'unknownRange' }]);
  });

  it('reports that adding one to an entire Byte interval can overflow', async () => {
    const code = dedent(`
      function calculate(left: Byte): Byte {
        return left + 1;
      }
    `);

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'possibleOutOfRange' }]);
  });

  it('evaluates addition at the upper bound', async () => {
    const code = 'const value: Byte = 200 + 55;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('evaluates subtraction at the lower bound', async () => {
    const code = 'const value: Byte = 100 - 100;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('evaluates multiplication within the range', async () => {
    const code = 'const value: Byte = 50 * 5;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('allows a fractional quotient', async () => {
    const code = 'const value: Byte = 255 / 2;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('evaluates remainder within the range', async () => {
    const code = 'const value: Byte = 1000 % 256;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('evaluates an integer power', async () => {
    const code = 'const value: Byte = 2 ** 7;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('evaluates a negated parenthesized expression', async () => {
    const code = 'const value: Between<-10, 10> = -(2 + 3);';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('respects parentheses and unary plus', async () => {
    const code = 'const value: Byte = +(2 + 3) * (4 - 1);';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('checks the final result when an intermediate value exceeds the range', async () => {
    const code = 'const value: Byte = 300 - 100;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('accepts negative zero produced by division', async () => {
    const code = 'const value: Between<-1, 1> = -0 / 2;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('allows division of a large finite Double', async () => {
    const code = 'const value: Double = 1e308 / 2;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('checks a finite final result after an infinite intermediate value', async () => {
    const code = 'const value: Byte = 1 / (1 / 0);';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('rejects a bitwise result outside the range', async () => {
    const code = 'const value: Byte = 512 | 0;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a subtraction below the lower bound', async () => {
    const code = 'const value: Byte = 0 - 1;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a multiplication above the upper bound', async () => {
    const code = 'const value: Byte = 100 * 3;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a quotient above the upper bound', async () => {
    const code = 'const value: Byte = 600 / 2;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('preserves the sign of a negative remainder', async () => {
    const code = 'const value: Byte = -5 % 2;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a power above the upper bound', async () => {
    const code = 'const value: Byte = 2 ** 8;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a unary minus result below the lower bound', async () => {
    const code = 'const value: Byte = -(2 + 3);';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a unary plus result above the upper bound', async () => {
    const code = 'const value: Byte = +(200 + 100);';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a parenthesized expression whose result exceeds the upper bound', async () => {
    const code = 'const value: Byte = (100 + 50) * 2;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects overflow to infinity during multiplication', async () => {
    const code = 'const value: Double = 1e308 * 2;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects positive infinity produced by division by zero', async () => {
    const code = 'const value: Double = 1 / 0;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects negative infinity produced by division by zero', async () => {
    const code = 'const value: Double = -1 / 0;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects NaN produced by zero divided by zero', async () => {
    const code = 'const value: Double = 0 / 0;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects NaN produced by remainder with zero', async () => {
    const code = 'const value: Double = 1 % 0;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects NaN produced by a fractional power of a negative base', async () => {
    const code = 'const value: Double = (-1) ** 0.5;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('uses JavaScript rounding when checking a fractional upper bound', async () => {
    const code = 'const value: Between<0, 0.3> = 0.1 + 0.2;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects an evaluated expression outside an explicit Between range', async () => {
    const code = 'const value: Between<1, 10> = 100 + 1;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });
});
