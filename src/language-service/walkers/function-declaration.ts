import * as ts from 'typescript/lib/tsserverlibrary';
import { test } from '..';
import { walkNodeList, nodeWalker } from '.';

export function functionDeclarationWalker(node: ts.FunctionDeclaration) {
  const { type } = node;

  if (type) {
    const types = type.getText();
  }
}
