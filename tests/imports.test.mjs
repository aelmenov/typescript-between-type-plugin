import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import parser from '@typescript-eslint/parser';
import plugin from '../lib/index.js';

test('imports, re-exports, namespace imports, generics and path aliases', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'between-imports-'));
  try {
    await mkdir(join(directory, 'types'));
    await writeFile(
      join(directory, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          paths: { '@ranges/*': ['./types/*'] },
        },
      }),
    );
    await writeFile(
      join(directory, 'types/ranges.ts'),
      `
      export type Channel = Between<0, 255>;
      export type Positive<Max extends number = 10> = Between<0, Max>;
      export interface Color { red: Channel; }
      export type Broken = Between<10, 1>;
      export function take(value: Channel): Channel { return value; }
      export const maximum = 255;
    `,
    );
    await writeFile(
      join(directory, 'barrel.ts'),
      'export { Channel as Byte, Positive, Color, Broken, take, maximum } from "./types/ranges.js";',
    );
    const eslint = new ESLint({
      cwd: directory,
      overrideConfigFile: true,
      overrideConfig: [
        {
          ...plugin.configs.recommended,
          files: ['**/*.ts'],
          languageOptions: { parser },
        },
      ],
    });
    const cases = [
      [
        'import type {Byte} from "./barrel.js"; const a: Byte = 256;',
        ['outOfRange'],
      ],
      [
        'import type {Channel as C} from "@ranges/ranges"; const a: C = 256;',
        ['outOfRange'],
      ],
      [
        'import type * as R from "./types/ranges.js"; const a: R.Channel = 256;',
        ['outOfRange'],
      ],
      [
        'import type {Positive} from "./barrel.js"; const a: Positive<5> = 6;',
        ['outOfRange'],
      ],
      [
        'import type {Positive} from "./barrel.js"; const a: Positive = 10;',
        [],
      ],
      [
        'import type {Color} from "./barrel.js"; const a: Color = {red: 256};',
        ['outOfRange'],
      ],
      ['import {take} from "./barrel.js"; take(256);', ['outOfRange']],
      ['import * as R from "./barrel.js"; R.take(256);', ['outOfRange']],
      [
        'import {maximum} from "./barrel.js"; const a: Byte = maximum + 1;',
        ['outOfRange'],
      ],
      [
        'import type {Broken} from "./barrel.js"; const a: Broken = 1;',
        ['invalidRange'],
      ],
    ];

    for (const [code, expected] of cases) {
      const [result] = await eslint.lintText(code, {
        filePath: join(directory, 'input.ts'),
      });

      assert.deepEqual(
        result.messages.map((message) => message.messageId),
        expected,
        `${code}\n${JSON.stringify(result.messages)}`,
      );
    }

    await writeFile(
      join(directory, 'types/ranges.ts'),
      'export type Channel = Between<0, 500>;',
    );

    const [changed] = await eslint.lintText(
      'import type {Channel} from "./types/ranges.js"; const a: Channel = 300;',
      { filePath: join(directory, 'input.ts') },
    );

    assert.deepEqual(changed.messages, []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
