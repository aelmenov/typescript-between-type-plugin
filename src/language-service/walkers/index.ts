import * as ts from 'typescript/lib/tsserverlibrary';

import { isVariableDeclaration, isVariableStatement } from '../../verificators';
import { Walker } from '../types';
import { variableDeclarationWalker, variableStatementWalker } from './variable-statement';

export function walkNodeList(node: ts.Node, walker: Walker) {
  walker(node);

  node.forEachChild(child => walkNodeList(child, walker));
}

export function nodeWalker(node: ts.Node) {
  if (isVariableStatement(node)) {
    variableStatementWalker(node);
  } else if (isVariableDeclaration(node)) {
    variableDeclarationWalker(node);
  }
}
