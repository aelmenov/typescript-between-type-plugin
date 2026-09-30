import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import parser from '@typescript-eslint/parser';
import plugin from '../lib/index.js';

const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: [{
  ...plugin.configs.recommended, files: ['**/*.ts'], languageOptions: { parser },
}] });
const valid = [
  'const x: {red?: Byte} = {};',
  'const x: Byte | undefined = undefined;',
  'const x: Byte | null = null;',
  'const x: Between<-0xff, 0xff> = 255;',
  'function f(...x: Byte[]) {} f(...[1, 2]);',

  'function f(x: unknown) { if (typeof x === "number" && x >= 0 && x <= 255) { const a: Byte = x; } }',
  'function f(x: number) { if (Number.isFinite(x) && !(x < 0 || x > 255)) { const a: Byte = x; } }',
  'function f(x: Between<-5, 5>): Between<-25, 25> { return x * x; }',
  'function f(x: Between<-5, 5>): Between<0, 25> { return x ** 2; }',
  'function f(x: Between<0, 10>, y: Between<1, 2>): Between<0, 10> { return x / y; }',
  'function f(x: Between<-5, 5>): Between<-10, 10> { return x * -2; }',
  'let a: Byte = 2; a **= 7;',

  'const a = 250; const b: Byte = a + 5;',
  'let a: Byte = 250; a += 5;',
  'let a: Byte = 0; a++; a--;',
  'function f(x: Between<0, 100>, y: Between<0, 100>): Byte { return x + y; }',
  'function f(x: number) { if (x >= 0 && x <= 255) { const a: Byte = x; } }',
  'function f(x: number) { if (!(x >= 0 && x <= 255)) return; const a: Byte = x; }',
  'function f(x: number) { if (0 <= x && 255 >= x) { const a: Byte = x; } }',
  'function f(x: number): Byte { if (x >= 0 && x <= 255) return x; return 0; }',
  'function f(x: Byte): Byte { return x; } const a: Byte = f(10);',
  'const f = (x: Byte): Byte => x; const a: Byte = f(10);',
  'const f: (x: Byte) => Byte = x => x;',
  'function f() { return 10; } const a: Byte = f();',
  'type Positive<M extends number> = Between<0, M>; const a: Positive<10> = 5;',
  'type R<A extends number, B extends number = 10> = Between<A, B>; const a: R<0> = 5;',
  'type R<T extends number> = Between<0, T>; type B = R<255>; const a: B = 5;',
  'type End = 255; const a: Between<0, End> = 5;',
  'interface Color { red: Byte; green: Byte; } const color: Color = { red: 10, green: 20 };',
  'const a: Byte[] = [1, 2, 128.5]; a[0] = 255;',
  'const a: [Byte, Short] = [255, -32768];',
  'const a: Array<Byte> = [1, 2]; a.push(3);',
  'const a: Record<string, Byte> = { first: 1, second: 255 };',
  'function f(...xs: Byte[]) {} f(1, 2, 3);',
  'class C { x: Byte = 1; constructor(x: Byte) { this.x = x; } } const c = new C(5);',
  'let a: Byte = 1; if (flag) a = 2; else a = 3; const b: Byte = a;',
  'let a: Byte = 1; while (a <= 100) { a += 1; }',
  'const a: Byte = 1 << 7;',
  'const xs: Byte[] = [1, 2]; for (const x of xs) { const a: Byte = x; }',
  'const pair: {x: Byte} = {x: 10}; const {x} = pair; const a: Byte = x;',
];
const invalid = [
  ['const f: (x: Byte) => Byte = x => x; f(256);', 'outOfRange'],
  ['const c: {f: () => Byte} = {f: () => 256};', 'outOfRange'],
  ['class C { get value(): Byte {return 256;} }', 'outOfRange'],

  ['let a: Byte = 0; [a] = [256];', 'outOfRange'],
  ['let a: Byte = 0; ({x: a} = {x: 256});', 'outOfRange'],
  ['let {x}: {x: Byte} = {x: 0}; x = 256;', 'outOfRange'],
  ['function f(xs: Byte[]) { const n: Byte = xs.length; }', 'possibleOutOfRange'],
  ['type C<T> = T extends string ? Byte : Short; const x: C<string> = 300;', 'invalidRange'],

  ['function f(): Byte { if (flag) return 1; }', 'unknownRange'],
  ['function f(x: number) { if (x < 0 || x > 255) return; const a: Byte = x; }', 'possibleOutOfRange'],
  ['function f(x: Between<1, 2>, y: Between<-1, 1>): Byte { return x / y; }', 'unknownRange'],
  ['let a: Byte = 2; a **= 8;', 'outOfRange'],

  ['function f(x: string) { if (x >= 0 && x <= 255) { const a: Byte = x; } }', 'unknownRange'],
  ['let x: Byte = 0; switch (flag) { case 1: x = 256; break; }', 'outOfRange'],
  ['let x: Byte = 0; try { external(); } catch (e) { x = 256; }', 'outOfRange'],
  ['class C { x: Byte = 0; } const c = new C(); c.x = 256;', 'outOfRange'],
  ['const a: [Byte, Short] = [0, 0]; a[i] = 300;', 'outOfRange'],
  ['const a: {x: Byte} = {x: 1}; external(a); const b: Byte = a.x;', 'unknownRange'],

  ['const a = 250; const b: Byte = a + 10;', 'outOfRange'],
  ['let a: Byte = 250; a += 10;', 'outOfRange'],
  ['let a: Byte = 255; a++;', 'outOfRange'],
  ['let a: Byte = 0; --a;', 'outOfRange'],
  ['function f(x: Byte): Byte { return x + 1; }', 'possibleOutOfRange'],
  ['function f(x: Short): Byte { return x; }', 'possibleOutOfRange'],
  ['function f(x: number): Byte { return x; }', 'unknownRange'],
  ['const a: Byte = external();', 'unknownRange'],
  ['function f(x: number) { if (x >= 0 && x <= 255) { x = 500; const a: Byte = x; } }', 'outOfRange'],
  ['function f(x: number) { if (x >= 0 && x <= 255) {} const a: Byte = x; }', 'possibleOutOfRange'],
  ['function f(x: number) { if (x >= 0 && x <= 255) { mutate(); const a: Byte = x; } }', 'unknownRange'],
  ['function f(x: Byte) {} f(256);', 'outOfRange'],
  ['function f(): Byte { return 256; }', 'outOfRange'],
  ['const f: () => Byte = () => 256;', 'outOfRange'],
  ['function f() { return 300; } const a: Byte = f();', 'outOfRange'],
  ['type Positive<M extends number> = Between<0, M>; const a: Positive<10> = 11;', 'outOfRange'],
  ['type R<T extends number> = Between<0, T>; type B = R<255>; const a: B = 256;', 'outOfRange'],
  ['type Bad = Between<10, 1>;', 'invalidRange'],
  ['type Bad = Between<0, 1e309>;', 'invalidRange'],
  ['type Bad = Between<0, number>;', 'invalidRange'],
  ['type Bad = Between<0>;', 'invalidRange'],
  ['interface C { red: Byte; } const c: C = {red: 256};', 'outOfRange'],
  ['const c: { red: Byte } = {red: 1}; c.red = 256;', 'outOfRange'],
  ['const c: { nested: {red: Byte} } = {nested: {red: 256}};', 'outOfRange'],
  ['const a: Byte[] = [1, 256];', 'outOfRange'],
  ['const a: Byte[] = [1]; a[0] = 256;', 'outOfRange'],
  ['const a: [Byte, Short] = [256, 0];', 'outOfRange'],
  ['const a: Byte[] = []; a.push(256);', 'outOfRange'],
  ['const a: Byte[] = []; a.splice(0, 0, 256);', 'outOfRange'],
  ['const a: Record<string, Byte> = {first: 256};', 'outOfRange'],
  ['function f(...xs: Byte[]) {} f(1, 256);', 'outOfRange'],
  ['class C { x: Byte = 256; }', 'outOfRange'],
  ['class C { constructor(x: Byte) {} } new C(256);', 'outOfRange'],
  ['const a: Byte = external() as Byte;', 'unknownRange'],
  ['const a = 256 satisfies Byte;', 'outOfRange'],
  ['let a: Byte = 0; while (flag) { a++; }', 'possibleOutOfRange'],
  ['let a: Byte = 1; if (flag) a = 500; const b: Byte = a;', 'outOfRange', 'possibleOutOfRange'],
];
for (const code of valid) test(`accept: ${code}`, async () => {
  const [result] = await eslint.lintText(code, { filePath: 'analysis-input.ts' });
  assert.deepEqual(result.messages, []);
});
for (const [code, ...expected] of invalid) test(`reject: ${code}`, async () => {
  const [result] = await eslint.lintText(code, { filePath: 'analysis-input.ts' });
  assert.deepEqual(result.messages.map(message => message.messageId), expected, JSON.stringify(result.messages));
});
test('cycles produce diagnostics without recursion failure', async () => {
  const [result] = await eslint.lintText('type A = B; type B = A; const a: A = 1;', { filePath: 'analysis-input.ts' });
  assert.ok(result.messages.length > 0);
  assert.ok(result.messages.every(message => message.messageId === 'invalidRange'));
});
test('unknown values can be explicitly ignored', async () => {
  const lint = new ESLint({ overrideConfigFile: true, overrideConfig: [{ files: ['**/*.ts'], languageOptions: { parser }, plugins: { between: plugin }, rules: { 'between/within-range': ['error', { unknownValues: 'ignore' }] } }] });
  const [result] = await lint.lintText('const a: Byte = external();', { filePath: 'analysis-input.ts' });
  assert.deepEqual(result.messages, []);
});
