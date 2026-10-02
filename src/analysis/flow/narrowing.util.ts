import ts from 'typescript';
import { number } from '../domain/domain.util.js';
import { mergeStates } from '../domain/state.util.js';
import type { State } from '../analyzer/analyzer.types.js';
import type { FlowAnalysis } from './flow.interfaces.js';

const reversedComparisons: Readonly<Record<string, string>> = {
  '<': '>',
  '>': '<',
  '<=': '>=',
  '>=': '<=',
  '===': '===',
  '!==': '!==',
};

const negatedComparisons: Readonly<Record<string, string>> = {
  '<': '>=',
  '<=': '>',
  '>': '<=',
  '>=': '<',
  '===': '!==',
  '!==': '===',
};

function narrow(analysis: FlowAnalysis, test: ts.Expression, truth: boolean, state: State): State {
  if (ts.isParenthesizedExpression(test)) return narrow(analysis, test.expression, truth, state);
  if (ts.isPrefixUnaryExpression(test) && test.operator === ts.SyntaxKind.ExclamationToken)
    return narrow(analysis, test.operand, !truth, state);
  if (
    ts.isCallExpression(test) &&
    ts.isPropertyAccessExpression(test.expression) &&
    ts.isIdentifier(test.expression.expression) &&
    test.expression.expression.text === 'Number' &&
    !analysis.types.declaration(test.expression.expression) &&
    test.arguments.length === 1 &&
    truth &&
    test.expression.name.text === 'isFinite'
  ) {
    const argument = test.arguments[0];

    if (argument && ts.isIdentifier(argument)) {
      const declaration = analysis.types.declaration(argument);

      if (declaration) state.set(declaration, number([[-Number.MAX_VALUE, Number.MAX_VALUE]]));
    }

    return state;
  }
  if (!ts.isBinaryExpression(test)) return state;
  if (
    ts.isTypeOfExpression(test.left) &&
    ts.isIdentifier(test.left.expression) &&
    ts.isStringLiteral(test.right) &&
    test.right.text === 'number' &&
    ((test.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken && truth) ||
      (test.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken && !truth))
  ) {
    const declaration = analysis.types.declaration(test.left.expression);

    if (declaration) state.set(declaration, number([[-Infinity, Infinity]], true));

    return state;
  }

  const token = test.operatorToken.kind;

  if (token === ts.SyntaxKind.AmpersandAmpersandToken || token === ts.SyntaxKind.BarBarToken) {
    const and = token === ts.SyntaxKind.AmpersandAmpersandToken;

    if (truth === and)
      return narrow(analysis, test.right, truth, narrow(analysis, test.left, truth, state));

    const left = narrow(analysis, test.left, truth, new Map(state));
    const right = narrow(
      analysis,
      test.right,
      truth,
      narrow(analysis, test.left, !truth, new Map(state)),
    );

    mergeStates(analysis, state, left, right);

    return state;
  }

  let identifier = test.left;
  let bound = test.right;
  let operator = test.operatorToken.getText();

  if (!ts.isIdentifier(identifier) && ts.isIdentifier(bound)) {
    [identifier, bound] = [bound, identifier];
    operator = reversedComparisons[operator] ?? '';
  }
  if (!ts.isIdentifier(identifier)) return state;

  const declaration = analysis.types.declaration(identifier);
  const limit = analysis.value(bound, new Map(state));
  const currentValue = analysis.value(identifier, state);
  const declaredNumeric =
    analysis.declared(declaration).kind === 'number' ||
    (analysis.types.checker.getTypeAtLocation(identifier).flags & ts.TypeFlags.NumberLike) !== 0;

  if (currentValue.kind !== 'number' && !declaredNumeric) return state;
  if (
    !declaration ||
    limit.kind !== 'number' ||
    limit.nan ||
    limit.ranges.length !== 1 ||
    limit.ranges[0]?.[0] !== limit.ranges[0]?.[1]
  )
    return state;

  const point = limit.ranges[0]?.[0];

  if (point === undefined || Number.isNaN(point)) return state;
  if (!truth) operator = negatedComparisons[operator] ?? '';

  let low = -Infinity;
  let high = Infinity;

  if (operator === '<' || operator === '<=') high = point;
  else if (operator === '>' || operator === '>=') low = point;
  else if (operator === '===') {
    low = point;
    high = point;
  } else return state;

  const current = analysis.value(identifier, state);
  const ranges = current.kind === 'number' ? current.ranges : [[-Infinity, Infinity] as const];
  // False ordered comparisons may include NaN. Keep it until a positive comparison excludes it.
  const nan =
    !truth &&
    !['===', '!=='].includes(test.operatorToken.getText()) &&
    (current.kind !== 'number' || current.nan);

  state.set(
    declaration,
    number(
      ranges
        .map(([a, b]) => [Math.max(a, low), Math.min(b, high)] as const)
        .filter(([a, b]) => a <= b),
      nan,
    ),
  );

  return state;
}

export function narrowCondition(
  analysis: FlowAnalysis,
  test: ts.Expression,
  truth: boolean,
  original: State,
): State {
  return narrow(analysis, test, truth, new Map(original));
}
