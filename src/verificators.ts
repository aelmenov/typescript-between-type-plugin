import * as ts from 'typescript/lib/tsserverlibrary';

import { BETWEEN_TYPE_IN_STRING_REGEX, BETWEEN_TYPE_REGEX } from './between/config';

export function isValidTypeScriptVersion(typescript: typeof ts) {
  const [ major ] = typescript.version.split('.');

  return +major >= 3;
}

export function isBetweenType(str: string) {
  return BETWEEN_TYPE_REGEX.test(str);
}

export function hasBetweenType(str: string) {
  return BETWEEN_TYPE_IN_STRING_REGEX.test(str);
}

export function isVariableDeclaration(node: ts.Node): node is ts.VariableDeclaration {
  return node.kind === ts.SyntaxKind.VariableDeclaration;
}

export function isVariableStatement(node: ts.Node): node is ts.VariableStatement {
  return node.kind === ts.SyntaxKind.VariableStatement;
}
