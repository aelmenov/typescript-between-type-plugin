import * as ts from 'typescript/lib/tsserverlibrary';

import { Walker } from '../types';
import { expressionStatementWalker } from './expression-statement';
import { variableDeclarationWalker, variableStatementWalker } from './variable-statement';

export function walkNodeList(node: ts.Node, walker: Walker) {
  walker(node);

  node.forEachChild(child => walkNodeList(child, walker));
}

export function nodeWalker(node: ts.Node) {
  if (ts.isVariableStatement(node)) {
    variableStatementWalker(node);
  } else if (ts.isVariableDeclaration(node)) {
    variableDeclarationWalker(node);
  } else if (ts.isExpressionStatement(node)) {
    expressionStatementWalker(node);
  }
}
