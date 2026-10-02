import ts from 'typescript';

export function isFunctionImplementation(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

export function propertyName(node: ts.PropertyName): string {
  return ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)
    ? node.text
    : node.getText();
}

export function accessKey(
  node: ts.PropertyAccessExpression | ts.ElementAccessExpression,
): string | undefined {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;

  const key = node.argumentExpression;

  return ts.isStringLiteral(key) || ts.isNumericLiteral(key) ? key.text : undefined;
}

export function bindingKey(element: ts.BindingElement): string {
  const pattern = element.parent;

  if (ts.isArrayBindingPattern(pattern)) return String(pattern.elements.indexOf(element));
  if (element.propertyName) return propertyName(element.propertyName);

  return element.name.getText();
}
