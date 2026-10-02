import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyze } from '../lib/analysis/analyzer/analyzer.service.js';

interface Scenario {
  name: string;
  code: string;
}

const declarations = Array.from(
  { length: 1200 },
  (_, index) => `const value${index}: Alias = ${index % 256};`,
).join('\n');
const fields = Array.from({ length: 250 }, (_, index) => `field${index}: Byte`).join(';');
const properties = Array.from({ length: 250 }, (_, index) => `field${index}: ${index % 256}`).join(
  ',',
);
const choices = Array.from(
  { length: 100 },
  (_, index) => `Between<${index * 2}, ${index * 2 + 1}>`,
).join(' | ');
const scenarios: Scenario[] = [
  { name: 'Small file', code: 'const channel: Byte = 256;' },
  {
    name: 'Repeated aliases',
    code: `type Small = Between<0, 255>; type Alias = Small; ${declarations}`,
  },
  {
    name: 'Generic calls',
    code: `function accept<Max extends number = 255>(value: Between<0, Max>): void {}
      ${Array.from({ length: 800 }, (_, index) => `accept(${index % 256});`).join('\n')}`,
  },
  {
    name: 'Wide objects',
    code: `interface Wide { ${fields} }
      ${Array.from({ length: 12 }, (_, index) => `const object${index}: Wide = {${properties}};`).join('\n')}`,
  },
  {
    name: 'Union coverage',
    code: `type Choices = ${choices};
      ${Array.from({ length: 400 }, (_, index) => `function check${index}(input: Choices): Choices { return input; }`).join('\n')}`,
  },
  {
    name: 'Alias graph',
    code: `type Range0 = Byte;
      ${Array.from({ length: 10 }, (_, index) => `type Range${index + 1} = Range${index} | Range${index};`).join('\n')}
      ${Array.from({ length: 20 }, (_, index) => `const graph${index}: Range10 = 5;`).join('\n')}`,
  },
  {
    name: 'Branch states',
    code: `${Array.from({ length: 300 }, (_, index) => `let value${index}: Byte = 5;`).join('\n')}
      function guarded(input: number): Byte {
        if (${Array.from({ length: 25 }, (_, index) => `input >= ${index}`).join(' && ')} && input <= 255) return input;
        return 0;
      }`,
  },
];

const directory = mkdtempSync(join(tmpdir(), 'between-benchmark-'));
const filename = join(directory, 'input.ts');

try {
  mkdirSync(join(directory, 'files'));
  writeFileSync(
    join(directory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext' },
      include: ['**/*.ts'],
    }),
  );

  for (let index = 0; index < 1200; index += 1)
    writeFileSync(join(directory, 'files', `${index}.ts`), `export const value = ${index};`);

  const results = scenarios.map(({ name, code }) => {
    for (let index = 0; index < 3; index += 1) analyze(code, filename, () => undefined, 'error');

    const samples: number[] = [];
    let diagnostics = 0;

    for (let index = 0; index < 11; index += 1) {
      let count = 0;

      const start = performance.now();

      analyze(
        code,
        filename,
        () => {
          count += 1;
        },
        'error',
      );
      samples.push(performance.now() - start);
      diagnostics = count;
    }

    samples.sort((a, b) => a - b);

    const median = samples[5];

    if (median === undefined) throw new Error(`No timing samples collected for ${name}`);

    return { scenario: name, medianMs: Number(median.toFixed(2)), diagnostics };
  });

  process.stdout.write(
    `${JSON.stringify({ node: process.version, warmups: 3, samples: 11, projectFiles: 1200, results }, null, 2)}\n`,
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
