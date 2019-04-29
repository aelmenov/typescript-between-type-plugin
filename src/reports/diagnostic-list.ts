import * as ts from 'typescript/lib/tsserverlibrary';

import { BetweenNode } from '../between/types';
import { PLUGIN_NAME } from '../config';
import { getCurrentBetweenNodeList } from '../project';
import { forEach } from '../utils';
import { Report } from './types';

export function createBetweenDiagnostics(): ts.Diagnostic[] {
  let diagnostics: ts.Diagnostic[] = [];

  forEach(getCurrentBetweenNodeList(), ([ , node ]) => {
    const { reportList } = node as BetweenNode<any>;

    forEach(reportList, ([ code ]) => {
      const report = reportList[code] as Report;
      const { message, category } = report;
      const { source, span } = node as BetweenNode<any>;
      const { start, length } = span;

      diagnostics.push({
        category,
        code: Number(code),
        file: source,
        start, length,
        messageText: message,
        source: PLUGIN_NAME
      });
    });
  });

  return diagnostics;
}
