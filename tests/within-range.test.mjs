import { after, describe, it } from 'node:test';
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import rule from '../lib/rules/within-range.js';
import { builtinBounds } from '../lib/builtin-ranges.js';

RuleTester.afterAll = after;
RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parser } });
const error = { messageId: 'outOfRange' };

tester.run('within-range', rule, {
  valid: [
    'const a: Byte = 200 + 55;',
    'const a: Byte = 100 - 100;',
    'const a: Byte = 50 * 5;',
    'const a: Byte = 255 / 2;',
    'const a: Byte = 1000 % 256;',
    'const a: Byte = 2 ** 7;',
    'const a: Between<-10, 10> = -(2 + 3);',
    'const a: Byte = +(2 + 3) * (4 - 1);',
    'const a: Byte = 300 - 100;',
    'const a: Between<-1, 1> = -0 / 2;',
    'const a: Double = 1e308 / 2;',
    'const a: Byte = 1 / (1 / 0);',
    // Non-numeric operands are checked in the invalid cases.

    'type Byte = Between<0, 255>; const a: Byte = 128.5;',
    'type Channel = Byte; type Byte = Between<0, 255>; const a: Channel = 255;',
    'type Low = Between<1, 10>; type Choice = Low | Between<20, 30>; const a: Choice = 25;',
    'type A = Between<1, 10>; type B = A | A; const a: B = 5;',
    'type Byte = Between<0, 500>; const a: Byte = 300;',
    'type Byte = number; const a: Byte = 300;',
    'import type { Byte } from "other"; const a: Byte = 300;',
    'interface Byte {} const a: Byte = 300;',
    'function f<Byte>() { const a: Byte = 300; }',
    'type A = Between<0, 1>; { type A = number; const a: A = 100; }',
    'const a: constructor = 100;',
    ...Object.entries(builtinBounds).flatMap(([name, [min, max]]) => [
      `const a: ${name} = ${min};`,
      `const a: ${name} = ${max};`,
      `const a: ${name} = 0.5;`,
    ]),
    'const a: Between<0, 100> = 0;',
    'const a: Between<0, 100> = 100;',
    'const a: Between<0, 100> = 42.5;',
    'const a: Between<-100, -10> = -50;',
    'const a: Between<-0.5, 0.5> = 0.25;',
    'const a: Between<5, 5> = 5;',
    'const a: Between<-1, 1> = 0;',
    'const a: Between<1e100, 1e200> = 1e150;',
    'let a: Between<-10, 10> = 5; a = -10; a = 2.5;',
    'const a: Between<1, 10> | Between<20, 30> = 25;',
    'const a: Between<1, 10> | number = 100;',
    'let a: Between<1, 10> = 5; function f() { let a = 0; a = 100; }',
    'let a: Between<1, 10> = 5; function f(a: number) { a = 100; }',
    'let a: number = 5; a = 100;',
    'const a = 100;',
    
  ],
  invalid: [
    { code: 'const a: Byte = getValue() + 1000;', errors: [{ messageId: 'unknownRange' }] },
    { code: 'const a: Byte = unknownValue * 0;', errors: [{ messageId: 'unknownRange' }] },
    { code: 'const a: Byte = "250" + 10;', errors: [{ messageId: 'unknownRange' }] },
    { code: 'const a: Byte = true + 300;', errors: [{ messageId: 'unknownRange' }] },
    { code: 'const a: Byte = 250n + 10n;', errors: [{ messageId: 'unknownRange' }] },
    { code: 'const a: Byte = 500 > 10;', errors: [{ messageId: 'unknownRange' }] },
    { code: 'const a: Byte = Math.pow(2, 10);', errors: [{ messageId: 'unknownRange' }] },
    { code: 'const a: Between<1, 10> = getValue();', errors: [{ messageId: 'unknownRange' }] },
    { code: 'const a: Byte = 512 | 0;', errors: [{ messageId: 'outOfRange' }] },
    { code: 'type A<T> = Between<0, 1>; const a: A<number> = 100;', errors: [{ messageId: 'outOfRange' }] },
    { code: 'type A<T = number> = Between<0, 1>; const a: A = 100;', errors: [{ messageId: 'outOfRange' }] },
    { code: 'const a: Byte<number> = 300;', errors: [{ messageId: 'invalidRange' }] },
    { code: 'const a: Between<10, 1> = 100;', errors: [{ messageId: 'invalidRange' }] },

    {
      code: 'const a: Byte = 250 + 10;',
      errors: [{ ...error, data: { value: '260', range: 'Between<0, 255>' }, column: 17, endColumn: 25 }],
    },

    ...Object.entries(builtinBounds).flatMap(([name, [min, max]]) => {
      const lower = Number(min) === 0 ? -1 : Number(min) * 2;
      const upper = Number(max) * 2;
      const literal = value => Number.isFinite(value) ? String(value) : value < 0 ? '-1e309' : '1e309';
      return [lower, upper].map(value => ({
        code: `const a: ${name} = ${literal(value)};`,
        errors: [error],
      }));
    }),
    ...[
      'const a: Byte = 250 + 10;',
      'const a: Byte = 0 - 1;',
      'const a: Byte = 100 * 3;',
      'const a: Byte = 600 / 2;',
      'const a: Byte = -5 % 2;',
      'const a: Byte = 2 ** 8;',
      'const a: Byte = -(2 + 3);',
      'const a: Byte = +(200 + 100);',
      'const a: Byte = (100 + 50) * 2;',
      'const a: Double = 1e308 * 2;',
      'const a: Double = 1 / 0;',
      'const a: Double = -1 / 0;',
      'const a: Double = 0 / 0;',
      'const a: Double = 1 % 0;',
      'const a: Double = (-1) ** 0.5;',
      'const a: Between<0, 0.3> = 0.1 + 0.2;',
      'const a: Between<1, 10> = 100 + 1;',
      'type Channel = Byte; let a: Channel = 0; a = 250 + 10;',
      'type Choice = Between<0, 10> | Between<20, 30>; const a: Choice = 10 + 5;',
      'type Byte = Between<0, 255>; const a: Byte = 256;',
      'type Channel = Byte; type Byte = Between<0, 255>; const a: Channel = -1;',
      'type Byte = Between<0, 255>; let a: Byte = 1; a = 256;',
      'type Low = Between<1, 10>; type Choice = Low | Between<20, 30>; const a: Choice = 15;',
      'type A = Between<1, 10>; type B = A | A; const a: B = 15;',
      'type A = Between<0, 1>; type B = A; { type A = Between<0, 100>; const a: B = 50; }',
      'type A = Between<0, 100>; { type A = Between<0, 1>; const a: A = 50; }',
      'type A = Between<0, 1>; { const A = 1; const a: A = 50; }',
      'type A = Between<0, 1>; let a: A = 0; { type A = number; a = 50; }',
      'const a: Byte = 256;',
      'type Channel = Byte; const a: Channel = -1;',
      'let a: Byte = 0; a = 256;',
      'const a: Byte | Short = 40000;',
      'const Byte = 1; const a: Byte = 256;',
      'const a: Between<0, 100> = -0.1;',
      'const a: Between<0, 100> = 100.1;',
      'const a: Between<-100, -10> = -101;',
      'const a: Between<-100, -10> = -9;',
      'const a: Between<-0.5, 0.5> = 0.75;',
      'const a: Between<5, 5> = 6;',
      'const a: Between<1, 10> = 0;',
      'const a: Between<1, 10> = -0;',
      'const a: Between<1, 10> = +11;',
      'const a: Between<1, 10> | Between<20, 30> = 15;',
      'const a: Between<1, 10> | Between<20, 30> = 0;',
      'let a: Between<1, 10> = 5; a = 0;',
      'let a: Between<1, 10> = 5; function f() { a = 100; }',
    ].map(code => ({ code, errors: [error] })),
    {
      code: 'let a: Between<-10, 10> = 5; a = 11; a = -11;',
      errors: [error, error],
    },
    {
      code: 'const a: Between<0, 10> = 11;',
      errors: [{ ...error, data: { value: '11', range: 'Between<0, 10>' }, column: 27, endColumn: 29 }],
    },
  ],
});
