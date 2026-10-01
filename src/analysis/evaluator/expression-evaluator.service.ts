import ts from 'typescript';
import { arithmetic, join, literal, unknown } from '../domain/domain.util.js';
import { declarationShape } from './declaration.mapper.js';
import { readMember } from '../domain/member.util.js';
import { narrowCondition } from '../flow/narrowing.util.js';
import { isImmutable, mergeStates } from '../domain/state.util.js';
import {
  accessKey,
  isFunctionImplementation,
  propertyName,
} from '../syntax.util.js';
import type { Environment, Shape } from '../domain/domain.types.js';
import type {
  AnalyzeFunction,
  CheckRange,
  State,
} from '../analyzer/analyzer.types.js';
import type { FlowAnalysis } from '../flow/flow.interfaces.js';
import type { TypeResolver } from '../type-resolver/type-resolver.service.js';

export class ExpressionEvaluator implements FlowAnalysis {
  private readonly evaluating = new Set<ts.Node>();

  constructor(
    readonly types: TypeResolver,
    private readonly environment: () => Environment,
    private readonly check: CheckRange,
    private readonly analyzeFunction: AnalyzeFunction,
  ) {}

  private get env(): Environment {
    return this.environment();
  }

  declared(declaration: ts.Declaration | undefined): Shape {
    return declarationShape(declaration, this.types, this.env);
  }

  value(node: ts.Expression, state: State): Shape {
    if (this.evaluating.has(node)) return unknown;

    this.evaluating.add(node);

    try {
      return this.expression(node, state);
    } finally {
      this.evaluating.delete(node);
    }
  }

  private target(node: ts.Expression): Shape {
    if (ts.isIdentifier(node))
      return this.declared(this.types.declaration(node));
    if (node.kind === ts.SyntaxKind.ThisKeyword)
      return this.value(node, new Map());
    if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
      const object = this.target(node.expression);
      const member = readMember(object, accessKey(node));

      return member.kind === 'unknown'
        ? this.declared(this.types.declaration(node))
        : member;
    }

    return unknown;
  }

  private expression(node: ts.Expression, state: State): Shape {
    if (ts.isNumericLiteral(node)) return literal(Number(node.text));
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      return { kind: 'other', tag: 'string' };
    if (
      node.kind === ts.SyntaxKind.TrueKeyword ||
      node.kind === ts.SyntaxKind.FalseKeyword
    )
      return { kind: 'other', tag: 'boolean' };
    if (node.kind === ts.SyntaxKind.NullKeyword)
      return { kind: 'other', tag: 'null' };
    if (
      ts.isParenthesizedExpression(node) ||
      ts.isNonNullExpression(node) ||
      ts.isAwaitExpression(node)
    )
      return this.value(node.expression, state);
    if (
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isSatisfiesExpression(node)
    ) {
      const value = this.value(node.expression, state);

      this.check(this.types.read(node.type, this.env), value, node.expression);

      return value;
    }
    if (ts.isIdentifier(node)) {
      const declaration = this.types.declaration(node);

      if (!declaration && node.text === 'undefined')
        return { kind: 'other', tag: 'undefined' };
      if (!declaration)
        return node.text === 'Infinity'
          ? literal(Infinity)
          : node.text === 'NaN'
            ? literal(NaN)
            : unknown;

      const stored = state.get(declaration);

      if (stored) {
        const contract = this.declared(declaration);

        return stored.kind === 'function' && contract.kind === 'function'
          ? contract
          : stored;
      }
      if (
        ts.isVariableDeclaration(declaration) &&
        declaration.initializer &&
        declaration.parent.flags & ts.NodeFlags.Const
      )
        return this.value(declaration.initializer, state);

      return this.declared(declaration);
    }
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      this.analyzeFunction(node, state);

      return { kind: 'function', declaration: node, env: this.env };
    }
    if (ts.isObjectLiteralExpression(node)) {
      const properties = new Map<string, Shape>();

      for (const property of node.properties) {
        if (ts.isPropertyAssignment(property))
          properties.set(
            propertyName(property.name),
            this.value(property.initializer, state),
          );
        if (ts.isShorthandPropertyAssignment(property))
          properties.set(property.name.text, this.value(property.name, state));
        if (ts.isMethodDeclaration(property)) {
          this.analyzeFunction(property, state);
          properties.set(propertyName(property.name), {
            kind: 'function',
            declaration: property,
            env: this.env,
          });
        }
        if (ts.isSpreadAssignment(property)) {
          const spread = this.value(property.expression, state);

          if (spread.kind !== 'object') return unknown;

          for (const entry of spread.properties) properties.set(...entry);
        }
      }

      return { kind: 'object', properties };
    }
    if (ts.isArrayLiteralExpression(node)) {
      const items: Shape[] = [];

      for (const element of node.elements) {
        if (ts.isSpreadElement(element)) {
          const spread = this.value(element.expression, state);

          if (spread.kind !== 'array' || !spread.items)
            return { kind: 'array', element: unknown };

          items.push(...spread.items);
        } else
          items.push(
            ts.isOmittedExpression(element)
              ? unknown
              : this.value(element, state),
          );
      }

      return {
        kind: 'array',
        items,
        element: items.reduce(join, items[0] ?? unknown),
      };
    }
    if (node.kind === ts.SyntaxKind.ThisKeyword) {
      for (
        let parent: ts.Node | undefined = node.parent;
        parent;
        parent = parent.parent
      ) {
        if (ts.isClassDeclaration(parent))
          return this.types.members(parent.members, this.env);
      }

      return unknown;
    }
    if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
      const member = readMember(
        this.value(node.expression, state),
        accessKey(node),
      );
      let root = node.expression;

      while (
        ts.isPropertyAccessExpression(root) ||
        ts.isElementAccessExpression(root)
      )
        root = root.expression;

      const declaration = this.types.declaration(root);

      if (declaration && state.has(declaration)) return member;

      return member.kind === 'unknown'
        ? this.declared(this.types.declaration(node))
        : member;
    }
    if (ts.isConditionalExpression(node)) {
      this.value(node.condition, state);
      const yes = narrowCondition(this, node.condition, true, state),
        no = narrowCondition(this, node.condition, false, state);
      const result = join(
        this.value(node.whenTrue, yes),
        this.value(node.whenFalse, no),
      );

      mergeStates(this, state, yes, no);

      return result;
    }
    if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
      const operand = this.value(node.operand, state);

      if (
        node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken
      ) {
        const next = arithmetic(
          node.operator === ts.SyntaxKind.PlusPlusToken ? '+' : '-',
          operand,
          literal(1),
        );

        this.assign(node.operand, next, node, state);

        return ts.isPostfixUnaryExpression(node) ? operand : next;
      }
      if (node.operator === ts.SyntaxKind.PlusToken) return operand;
      if (node.operator === ts.SyntaxKind.MinusToken)
        return arithmetic('*', literal(-1), operand);
      if (node.operator === ts.SyntaxKind.TildeToken)
        return arithmetic('^', operand, literal(-1));

      return unknown;
    }
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;

      if (op === ts.SyntaxKind.EqualsToken) {
        const result = this.value(node.right, state);

        this.assign(node.left, result, node.right, state);

        return result;
      }
      if (
        op >= ts.SyntaxKind.FirstCompoundAssignment &&
        op <= ts.SyntaxKind.LastCompoundAssignment
      ) {
        const operator = node.operatorToken.getText().slice(0, -1);
        const result = arithmetic(
          operator,
          this.value(node.left, state),
          this.value(node.right, state),
        );

        this.assign(node.left, result, node, state);

        return result;
      }
      if (
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.QuestionQuestionToken
      ) {
        this.value(node.left, state);
        const branch = narrowCondition(
          this,
          node.left,
          op === ts.SyntaxKind.AmpersandAmpersandToken,
          state,
        );

        this.value(node.right, branch);
        mergeStates(this, state, state, branch);

        return unknown;
      }

      const left = this.value(node.left, state),
        right = this.value(node.right, state);

      if (op === ts.SyntaxKind.CommaToken) return right;
      if (
        [
          ts.SyntaxKind.LessThanToken,
          ts.SyntaxKind.GreaterThanToken,
          ts.SyntaxKind.LessThanEqualsToken,
          ts.SyntaxKind.GreaterThanEqualsToken,
          ts.SyntaxKind.EqualsEqualsToken,
          ts.SyntaxKind.EqualsEqualsEqualsToken,
          ts.SyntaxKind.ExclamationEqualsToken,
          ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ].includes(op)
      )
        return unknown;

      return arithmetic(node.operatorToken.getText(), left, right);
    }
    if (ts.isNewExpression(node)) {
      const declaration = this.types.declaration(node.expression);

      if (declaration && ts.isClassDeclaration(declaration)) {
        const env = this.types.bind(
          declaration.typeParameters,
          node.typeArguments,
          this.env,
        );
        const constructor = declaration.members.find(
          ts.isConstructorDeclaration,
        );

        node.arguments?.forEach((argument, index) =>
          this.check(
            this.types.read(constructor?.parameters[index]?.type, env),
            this.value(argument, state),
            argument,
          ),
        );

        return this.types.members(declaration.members, env);
      }
    }
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const fn = this.value(node.expression, state);
      const args: Shape[] = [];

      for (const argument of node.arguments ?? []) {
        if (ts.isSpreadElement(argument)) {
          const spread = this.value(argument.expression, state);

          if (spread.kind === 'array' && spread.items)
            args.push(...spread.items);
          else args.push(unknown);
        } else args.push(this.value(argument, state));
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ['push', 'unshift', 'splice', 'fill'].includes(
          node.expression.name.text,
        )
      ) {
        const array = this.target(node.expression.expression);

        if (array.kind === 'array') {
          const start = node.expression.name.text === 'splice' ? 2 : 0;
          const end = node.expression.name.text === 'fill' ? 1 : args.length;

          args
            .slice(start, end)
            .forEach((value, index) =>
              this.check(
                array.element,
                value,
                node.arguments?.[start + index] ?? node,
              ),
            );
        }
      }

      let result: Shape = unknown;

      if (fn.kind === 'function') {
        const env = this.types.bind(
          fn.declaration.typeParameters,
          node.typeArguments,
          fn.env,
        );

        fn.declaration.parameters.forEach((parameter, index) => {
          const target = this.types.read(parameter.type, env);

          if (parameter.dotDotDotToken && target.kind === 'array')
            args
              .slice(index)
              .forEach((value, offset) =>
                this.check(
                  target.element,
                  value,
                  node.arguments?.[index + offset] ?? node,
                ),
              );
          else if (index < args.length)
            this.check(
              target,
              args[index] ?? unknown,
              node.arguments?.[index] ?? node,
            );
        });
        result = this.types.read(fn.declaration.type, env);
        if (!fn.declaration.type && isFunctionImplementation(fn.declaration)) {
          result = this.analyzeFunction(fn.declaration, state);
        }
      }

      // Unknown side effects can invalidate both narrowed variables and aggregate values.
      for (const declaration of state.keys())
        if (
          !isImmutable(declaration) ||
          ['object', 'array'].includes(state.get(declaration)?.kind ?? '')
        )
          state.set(declaration, unknown);

      return result;
    }

    ts.forEachChild(node, (child) => {
      if (ts.isExpression(child)) this.value(child, state);
    });

    return unknown;
  }

  private assign(
    node: ts.Expression,
    value: Shape,
    location: ts.Node,
    state: State,
  ) {
    if (ts.isArrayLiteralExpression(node)) {
      node.elements.forEach((element, index) => {
        if (!ts.isOmittedExpression(element))
          this.assign(
            element,
            readMember(value, String(index)),
            location,
            state,
          );
      });

      return;
    }
    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (ts.isShorthandPropertyAssignment(property))
          this.assign(
            property.name,
            readMember(value, property.name.text),
            location,
            state,
          );
        if (ts.isPropertyAssignment(property))
          this.assign(
            property.initializer,
            readMember(value, propertyName(property.name)),
            location,
            state,
          );
      }

      return;
    }
    if (ts.isElementAccessExpression(node) && accessKey(node) === undefined) {
      const container = this.target(node.expression);

      if (container.kind === 'array' && container.items)
        container.items.forEach((item) => this.check(item, value, location));
      else this.check(this.target(node), value, location);
    } else this.check(this.target(node), value, location);
    if (ts.isIdentifier(node)) {
      const declaration = this.types.declaration(node);

      if (declaration) state.set(declaration, value);
    } else if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
      for (const [key, item] of state)
        if (item.kind === 'object' || item.kind === 'array')
          state.set(key, unknown);
    }
  }
}
