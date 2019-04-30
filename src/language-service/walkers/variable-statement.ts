import * as ts from 'typescript/lib/tsserverlibrary';

import { createBetweenNode } from '../../between';
import { BetweenNodeTypeKind } from '../../between/enums';
import { setBetweenNode } from '../../project';
import { hasBetweenType, isVariableDeclaration } from '../../verificators';
import { getNamedNodeParameters } from '../utils';
import { createReportListForAssignments } from '../../reports/assignment-errors';
import { createRangeListFromTypeString } from '../../between/utils';

export function variableStatementWalker(node: ts.VariableStatement) {
  node.declarationList.forEachChild(node => {
    if (isVariableDeclaration(node)) {
      variableDeclarationWalker(node);
    }
  });
}

export function variableDeclarationWalker(node: ts.VariableDeclaration) {
  const { type, initializer } = node;

  if (type) {
    const types = type.getText();

    if (types && hasBetweenType(types)) {
      const nodeParameters = getNamedNodeParameters(node);

      if (nodeParameters) {
        const { name, span, hash } = nodeParameters;

        const rangeList = createRangeListFromTypeString(types);
        const betweenNode = createBetweenNode<number | undefined>(BetweenNodeTypeKind.VariableDefinition, name, undefined, span, rangeList);

        if (initializer) {
          betweenNode.value = +initializer.getText();

          betweenNode.reportList = createReportListForAssignments(betweenNode, span);
        }

        setBetweenNode(hash, betweenNode);
      }
    }
  }
}
