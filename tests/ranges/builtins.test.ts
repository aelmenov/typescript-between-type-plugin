import { builtinBounds } from '../../lib/ranges/builtin-ranges.constants.js';
import { lintSource } from '../support/lint.util.js';

function numberLiteral(value: number): string {
  if (Number.isFinite(value)) return String(value);

  return value < 0 ? '-1e309' : '1e309';
}

describe('Built in numeric ranges', () => {
  describe.each(Object.entries(builtinBounds))('%s', (name, [min, max]) => {
    it('includes its declared lower bound', async () => {
      const code = `const value: ${name} = ${min};`;

      const messages = await lintSource(code);

      expect(messages).toEqual([]);
    });

    it('includes its declared upper bound', async () => {
      const code = `const value: ${name} = ${max};`;

      const messages = await lintSource(code);

      expect(messages).toEqual([]);
    });

    it('allows fractions even when its bounds are integers', async () => {
      const code = `const value: ${name} = 0.5;`;

      const messages = await lintSource(code);

      expect(messages).toEqual([]);
    });

    it('rejects a value below its lower bound', async () => {
      const below = Number(min) === 0 ? -1 : Number(min) * 2;
      const code = `const value: ${name} = ${numberLiteral(below)};`;

      const messages = await lintSource(code);

      expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
    });

    it('rejects a value above its upper bound', async () => {
      const above = Number(max) * 2;
      const code = `const value: ${name} = ${numberLiteral(above)};`;

      const messages = await lintSource(code);

      expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
    });
  });
});
