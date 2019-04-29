import * as ts from 'typescript/lib/tsserverlibrary';

import { createBetweenId, createBetweenNode, createRangeFromTypeString } from '../../between';
import { setCurrentBetweenNode } from '../../project';
import { createReportList } from '../../reports';
import { createSpan } from '../../utils';
import { hasBetweenType, isVariableDeclaration } from '../../verificators';

export function variableStatementWalker(node: ts.VariableStatement) {
  node.declarationList.forEachChild(node => {
    if (isVariableDeclaration(node)) {
      variableDeclarationWalker(node);
    }
  });
}

export function variableDeclarationWalker(node: ts.VariableDeclaration) {
  const typeNode = node.type;

  if (typeNode) {
    const types = typeNode.getText();
    const initializer = node.initializer;

    if (types && hasBetweenType(types) && initializer) {
      const value = +initializer.getText();
      const nameNode = node.name;
      const name = nameNode.getText();
      const nameSpan = createSpan(nameNode.getStart(), nameNode.getEnd());
      const id = createBetweenId(name, nameSpan.start, nameSpan.length);
      const ranges = createRangeFromTypeString(types);
      const betweenNode = createBetweenNode(name, value, nameSpan, ranges);

      betweenNode.reportList = createReportList(betweenNode);

      setCurrentBetweenNode(id, betweenNode);
    }
  }
}
