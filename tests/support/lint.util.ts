import parser from '@typescript-eslint/parser';
import { TSESLint } from '@typescript-eslint/utils';
import plugin from 'eslint-plugin-between';

interface LintOptions {
  cwd?: string;
  unknownValues?: 'error' | 'ignore';
}

export function createLinter(options: LintOptions = {}): TSESLint.ESLint {
  return new TSESLint.ESLint({
    cwd: options.cwd,
    overrideConfigFile: true,
    overrideConfig: [
      {
        ...plugin.configs.recommended,
        files: ['**/*.ts'],
        languageOptions: { parser },
        ...(options.unknownValues && {
          rules: {
            'between/within-range': ['error', { unknownValues: options.unknownValues }],
          },
        }),
      },
    ],
  });
}

const defaultLinter = createLinter();

export async function lintSource(
  code: string,
  linter = defaultLinter,
  filePath = 'input.ts',
): Promise<TSESLint.ESLint.LintMessage[]> {
  const [result] = await linter.lintText(code, { filePath });

  if (!result) {
    throw new Error(`ESLint returned no result for ${filePath}`);
  }

  return result.messages;
}
