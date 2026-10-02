import { lintSource } from '../support/lint.util.js';

describe('Inclusive range boundaries', () => {
  it('allows undefined in an explicit optional union', async () => {
    const code = 'const value: Byte | undefined = undefined;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('allows null in an explicit nullable union', async () => {
    const code = 'const value: Byte | null = null;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('accepts hexadecimal range bounds', async () => {
    const code = 'const value: Between<-0xff, 0xff> = 255;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('includes the lower bound', async () => {
    const code = 'const value: Between<0, 100> = 0;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('includes the upper bound', async () => {
    const code = 'const value: Between<0, 100> = 100;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('allows fractional values in a range with integer bounds', async () => {
    const code = 'const value: Between<0, 100> = 42.5;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('accepts a value between two negative bounds', async () => {
    const code = 'const value: Between<-100, -10> = -50;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('accepts fractional bounds', async () => {
    const code = 'const value: Between<-0.5, 0.5> = 0.25;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('accepts the single value of a range with equal bounds', async () => {
    const code = 'const value: Between<5, 5> = 5;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('accepts zero when the range crosses zero', async () => {
    const code = 'const value: Between<-1, 1> = 0;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('accepts bounds written in scientific notation', async () => {
    const code = 'const value: Between<1e100, 1e200> = 1e150;';

    const messages = await lintSource(code);

    expect(messages).toEqual([]);
  });

  it('rejects the value immediately above Byte', async () => {
    const code = 'const value: Byte = 256;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a fraction below the lower bound', async () => {
    const code = 'const value: Between<0, 100> = -0.1;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a fraction above the upper bound', async () => {
    const code = 'const value: Between<0, 100> = 100.1;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a value below two negative bounds', async () => {
    const code = 'const value: Between<-100, -10> = -101;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a value above two negative bounds', async () => {
    const code = 'const value: Between<-100, -10> = -9;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects a value above a fractional upper bound', async () => {
    const code = 'const value: Between<-0.5, 0.5> = 0.75;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects any other value when both bounds are equal', async () => {
    const code = 'const value: Between<5, 5> = 6;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('rejects zero when the lower bound is positive', async () => {
    const code = 'const value: Between<1, 10> = 0;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('treats negative zero as zero at a positive lower bound', async () => {
    const code = 'const value: Between<1, 10> = -0;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks unary plus at the upper bound', async () => {
    const code = 'const value: Between<1, 10> = +11;';

    const messages = await lintSource(code);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });
});
