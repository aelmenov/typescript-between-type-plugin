import { mkdir, readFile, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { builtinBounds } from '../../lib/ranges/builtin-ranges.constants.js';
import { createProject, removeProject, writeProjectFile } from '../support/project.util.js';

const packageRoot = fileURLToPath(new URL('../../', import.meta.url));

describe('Global declarations installed in a consumer project', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await createProject();

    await mkdir(join(directory, 'node_modules/@elmenov-softworks'), { recursive: true });
    await symlink(
      packageRoot,
      join(directory, 'node_modules/@elmenov-softworks/eslint-plugin-between'),
      'junction',
    );
    await writeProjectFile(
      directory,
      'input.ts',
      [
        'const value: Between<-0.5, 0.5> = 0.25;',
        ...Object.keys(builtinBounds).map((name) => `const value${name}: ${name} = 0.5;`),
      ].join('\n'),
    );
  });

  afterEach(async () => {
    await removeProject(directory);
  });

  it.each([
    {
      name: 'Node10',
      moduleResolution: ts.ModuleResolutionKind.Node10,
      module: ts.ModuleKind.CommonJS,
    },
    {
      name: 'NodeNext',
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      module: ts.ModuleKind.NodeNext,
    },
  ])('loads every global range with $name resolution', ({ moduleResolution, module }) => {
    const program = ts.createProgram([join(directory, 'input.ts')], {
      configFilePath: join(directory, 'tsconfig.json'),
      noEmit: true,
      strict: true,
      types: ['@elmenov-softworks/eslint-plugin-between/types'],
      moduleResolution,
      module,
      ignoreDeprecations: '6.0',
    });

    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));

    expect(diagnostics).toEqual([]);
  });
});

describe('Published numeric aliases', () => {
  it('exposes exactly the documented aliases and preserves every bound literal', async () => {
    const text = await readFile(join(packageRoot, 'lib.between.d.ts'), 'utf8');
    const source = ts.createSourceFile('lib.between.d.ts', text, ts.ScriptTarget.Latest, true);
    const declared = new Map<string, string[]>();

    for (const statement of source.statements) {
      if (!ts.isTypeAliasDeclaration(statement) || statement.name.text === 'Between') continue;

      if (!ts.isTypeReferenceNode(statement.type) || !statement.type.typeArguments) {
        throw new Error(`${statement.name.text} must reference Between with two bounds`);
      }

      expect(statement.type.typeName.getText(source)).toBe('Between');
      const bounds = statement.type.typeArguments.map((argument) => argument.getText(source));

      expect(bounds).toHaveLength(2);
      declared.set(statement.name.text, bounds);
    }

    expect([...declared.keys()]).toEqual([
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
    expect(Object.fromEntries(declared)).toEqual(builtinBounds);
  });

  it.each([
    { signed: 'SByte', unsigned: 'Byte', bits: 8n },
    { signed: 'Short', unsigned: 'UShort', bits: 16n },
    { signed: 'Int', unsigned: 'UInt', bits: 32n },
    { signed: 'Long', unsigned: 'ULong', bits: 64n },
  ] as const)(
    'uses the $bits bit bounds for $signed and $unsigned',
    ({ signed, unsigned, bits }) => {
      const signedBounds = [String(-(2n ** (bits - 1n))), String(2n ** (bits - 1n) - 1n)];
      const unsignedBounds = ['0', String(2n ** bits - 1n)];

      expect(builtinBounds[signed]).toEqual(signedBounds);
      expect(builtinBounds[unsigned]).toEqual(unsignedBounds);
    },
  );
});
