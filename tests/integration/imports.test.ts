import type { TSESLint } from '@typescript-eslint/utils';
import { join } from 'node:path';
import { createLinter, lintSource } from '../support/lint.util.js';
import { createProject, removeProject, writeProjectFile } from '../support/project.util.js';
import { dedent } from '../support/source.util.js';

describe('Range contracts imported from a consumer project', () => {
  let directory: string;
  let linter: TSESLint.ESLint;
  let filename: string;

  beforeEach(async () => {
    directory = await createProject();
    filename = join(directory, 'input.ts');

    await writeProjectFile(
      directory,
      'tsconfig.json',
      JSON.stringify({
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          paths: { '@ranges/*': ['./types/*'] },
        },
      }),
    );
    await writeProjectFile(
      directory,
      'types/ranges.ts',
      dedent(`
        export type Channel = Between<0, 255>;
        export type Positive<Max extends number = 10> = Between<0, Max>;
        export interface Color {
          red: Channel;
        }

        export type Broken = Between<10, 1>;

        export function take(value: Channel): Channel {
          return value;
        }

        export const maximum = 255;
      `),
    );
    await writeProjectFile(
      directory,
      'barrel.ts',
      dedent(`
        export {
          Channel as Byte, Positive, Color, Broken, take, maximum,
        } from './types/ranges.js';
      `),
    );

    linter = createLinter({ cwd: directory });
  });

  afterEach(async () => {
    await removeProject(directory);
  });

  it('follows a renamed type re export to its original range', async () => {
    const code = dedent(`
      import type { Byte } from './barrel.js';

      const channel: Byte = 256;
    `);

    const messages = await lintSource(code, linter, filename);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('resolves a renamed import through a tsconfig path alias', async () => {
    const code = dedent(`
      import type { Channel as ColorChannel } from '@ranges/ranges';

      const channel: ColorChannel = 256;
    `);

    const messages = await lintSource(code, linter, filename);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('resolves a type accessed through a namespace import', async () => {
    const code = dedent(`
      import type * as Ranges from './types/ranges.js';

      const channel: Ranges.Channel = 256;
    `);

    const messages = await lintSource(code, linter, filename);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('substitutes an explicit bound in an imported generic alias', async () => {
    const code = dedent(`
      import type { Positive } from './barrel.js';

      const value: Positive<5> = 6;
    `);

    const messages = await lintSource(code, linter, filename);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('uses the default bound of an imported generic alias', async () => {
    const code = dedent(`
      import type { Positive } from './barrel.js';

      const value: Positive = 10;
    `);

    const messages = await lintSource(code, linter, filename);

    expect(messages).toEqual([]);
  });

  it('checks a property contract declared in an imported interface', async () => {
    const code = dedent(`
      import type { Color } from './barrel.js';

      const color: Color = { red: 256 };
    `);

    const messages = await lintSource(code, linter, filename);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks a parameter contract on an imported function', async () => {
    const code = dedent(`
      import { take } from './barrel.js';

      take(256);
    `);

    const messages = await lintSource(code, linter, filename);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('checks a parameter contract on a function accessed through a namespace', async () => {
    const code = dedent(`
      import * as Ranges from './barrel.js';

      Ranges.take(256);
    `);

    const messages = await lintSource(code, linter, filename);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('propagates the value of an imported constant into arithmetic', async () => {
    const code = dedent(`
      import { maximum } from './barrel.js';

      const channel: Byte = maximum + 1;
    `);

    const messages = await lintSource(code, linter, filename);

    expect(messages).toMatchObject([{ messageId: 'outOfRange' }]);
  });

  it('reports an invalid range declared in an imported alias', async () => {
    const code = dedent(`
      import type { Broken } from './barrel.js';

      const value: Broken = 1;
    `);

    const messages = await lintSource(code, linter, filename);

    expect(messages).toMatchObject([{ messageId: 'invalidRange' }]);
  });

  it('reads an updated imported range when linting again with the same ESLint instance', async () => {
    const code = dedent(`
      import type { Channel } from './types/ranges.js';

      const channel: Channel = 300;
    `);
    const before = await lintSource(code, linter, filename);

    await writeProjectFile(directory, 'types/ranges.ts', 'export type Channel = Between<0, 500>;');
    const after = await lintSource(code, linter, filename);

    expect(before).toMatchObject([{ messageId: 'outOfRange' }]);
    expect(after).toEqual([]);
  });
});
