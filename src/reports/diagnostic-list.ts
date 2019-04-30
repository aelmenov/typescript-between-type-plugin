import * as ts from 'typescript/lib/tsserverlibrary';

import { BetweenNode } from '../between/types';
import { PLUGIN_NAME } from '../config';
import { getBetweenNodeList } from '../project';
import { forEach } from '../utils';

export function createBetweenDiagnosticList() {
  let diagnostics: ts.Diagnostic[] = [];

  forEach(getBetweenNodeList(), ([ , betweenNode ]) => {
    const { reportList } = betweenNode as BetweenNode<any>;

    reportList.forEach(([ code, report ]) => {
      const { span, message, category } = report;
      const { source } = betweenNode as BetweenNode<any>;
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
