import { ESLintUtils } from '@typescript-eslint/utils';
import type { Message } from '../analysis/analyzer/analyzer.types.js';
import type { WithinRangeOptions } from './within-range.interfaces.js';
import { analyze } from '../analysis/analyzer/analyzer.service.js';

export default ESLintUtils.RuleCreator(
  () =>
    'https://github.com/aelmenov/typescript-between-type-plugin/blob/master/docs/within-range.md',
)<[WithinRangeOptions], Message>({
  name: 'within-range',
  meta: {
    type: 'problem',
    docs: {
      description: 'Check numeric ranges at assignments and API boundaries.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          unknownValues: { type: 'string', enum: ['error', 'ignore'] },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      outOfRange: 'Value {{value}} is outside the allowed range {{range}}.',
      possibleOutOfRange:
        'Value {{value}} may fall outside the allowed range {{range}}.',
      unknownRange:
        'Cannot prove that this value satisfies the required numeric range.',
      invalidRange: 'Invalid range declaration: {{reason}}',
    },
  },
  defaultOptions: [{ unknownValues: 'error' }],
  create(context, [options]) {
    return {
      'Program:exit'() {
        analyze(
          context.sourceCode.text,
          context.filename,
          (node, messageId, data) => {
            context.report({
              loc: {
                start: context.sourceCode.getLocFromIndex(node.getStart()),
                end: context.sourceCode.getLocFromIndex(node.getEnd()),
              },
              messageId,
              data,
            });
          },
          options.unknownValues ?? 'error',
        );
      },
    };
  },
});
