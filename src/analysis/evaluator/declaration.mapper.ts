import ts from 'typescript';
import { unknown } from '../domain/domain.util.js';
import { readMember } from '../domain/member.util.js';
import { propertyName } from '../syntax.util.js';
import type { Environment, Shape } from '../domain/domain.types.js';
import type { TypeResolver } from '../type-resolver/type-resolver.service.js';

export function declarationShape(
  declaration: ts.Declaration | undefined,
  types: TypeResolver,
  env: Environment,
): Shape {
  if (!declaration) return unknown;
  if (ts.isBindingElement(declaration)) {
    const pattern = declaration.parent;
    const parent = pattern.parent;
    const key = ts.isArrayBindingPattern(pattern)
      ? String(pattern.elements.indexOf(declaration))
      : declaration.propertyName
        ? propertyName(declaration.propertyName)
        : declaration.name.getText();

    if (
      ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isBindingElement(parent)
    )
      return readMember(declarationShape(parent, types, env), key);
  }
  if (
    ts.isVariableDeclaration(declaration) ||
    ts.isParameter(declaration) ||
    ts.isPropertyDeclaration(declaration) ||
    ts.isPropertySignature(declaration) ||
    ts.isBindingElement(declaration)
  ) {
    if ('type' in declaration) return types.read(declaration.type, env);
  }
  if (ts.isGetAccessorDeclaration(declaration))
    return types.read(declaration.type, env);
  if (ts.isSetAccessorDeclaration(declaration))
    return types.read(declaration.parameters[0]?.type, env);
  if (
    ts.isFunctionDeclaration(declaration) ||
    ts.isMethodDeclaration(declaration) ||
    ts.isMethodSignature(declaration)
  )
    return { kind: 'function', declaration, env };

  return unknown;
}
