import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  writeFile,
  symlink,
  rm,
  readFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';
import { builtinBounds } from '../lib/ranges/builtin-ranges.constants.js';

for (const moduleResolution of [
  ts.ModuleResolutionKind.Node10,
  ts.ModuleResolutionKind.NodeNext,
]) {
  test(`global declaration resolves with module resolution ${moduleResolution}`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'between-types-'));
    try {
      await mkdir(join(directory, 'node_modules'));
      await symlink(
        fileURLToPath(new URL('..', import.meta.url)),
        join(directory, 'node_modules/eslint-plugin-between'),
        'junction',
      );
      const source = join(directory, 'input.ts');

      await writeFile(
        source,
        'const value: Between<-0.5, 0.5> = 0.25;\n' +
          Object.keys(builtinBounds)
            .map((name) => `const value${name}: ${name} = 0.5;`)
            .join('\n'),
      );
      const program = ts.createProgram([source], {
        configFilePath: join(directory, 'tsconfig.json'),
        noEmit: true,
        strict: true,
        types: ['eslint-plugin-between/types'],
        moduleResolution,
        module:
          moduleResolution === ts.ModuleResolutionKind.NodeNext
            ? ts.ModuleKind.NodeNext
            : ts.ModuleKind.CommonJS,
        ...(Number(ts.versionMajorMinor.split('.')[0]) >= 6
          ? { ignoreDeprecations: '6.0' }
          : {}),
      });
      const diagnostics = ts.getPreEmitDiagnostics(program);

      assert.deepEqual(
        diagnostics.map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        ),
        [],
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
}

test('built-in bounds match the public declarations without losing their source spelling', async () => {
  const source = ts.createSourceFile(
    'lib.between.d.ts',
    await readFile(new URL('../lib.between.d.ts', import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const declared = {};

  for (const statement of source.statements) {
    if (
      !ts.isTypeAliasDeclaration(statement) ||
      statement.name.text === 'Between'
    )
      continue;

    assert.ok(ts.isTypeReferenceNode(statement.type));
    assert.equal(statement.type.typeName.getText(source), 'Between');
    declared[statement.name.text] = statement.type.typeArguments.map(
      (argument) => argument.getText(source),
    );
  }

  assert.deepEqual(Object.keys(declared), [
    'SByte',
    'Byte',
    'Short',
    'UShort',
    'Int',
    'UInt',
    'Long',
    'ULong',
    'Float',
    'Double',
    'Decimal',
  ]);
  assert.deepEqual(declared, builtinBounds);
});

test('integer presets use the documented signed and unsigned bit ranges', () => {
  for (const [signed, unsigned, bits] of [
    ['SByte', 'Byte', 8n],
    ['Short', 'UShort', 16n],
    ['Int', 'UInt', 32n],
    ['Long', 'ULong', 64n],
  ]) {
    assert.deepEqual(builtinBounds[signed], [
      String(-(2n ** (bits - 1n))),
      String(2n ** (bits - 1n) - 1n),
    ]);
    assert.deepEqual(builtinBounds[unsigned], ['0', String(2n ** bits - 1n)]);
  }
});
