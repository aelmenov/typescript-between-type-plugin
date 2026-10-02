import ts from 'typescript';
import { propertyName } from '../syntax.util.js';
import { getBuiltinRange } from '../../ranges/builtin-ranges.util.js';
import { invalid, literal, number, unknown, unrestricted } from '../domain/domain.util.js';
import type { Binding, Environment, Shape } from '../domain/domain.types.js';
import type { Problem } from './type-resolver.types.js';
import type { Resolution } from './type-resolver.interfaces.js';
import { bindTypeParameters } from './bindings.util.js';

export class TypeResolver {
  private readonly active = new Set<ts.Node>();
  private readonly resolutions = new WeakMap<Environment, WeakMap<ts.TypeNode, Resolution>>();
  private readonly valueDeclarations = new WeakMap<ts.Node, ts.Declaration | undefined>();
  private readonly typeDeclarations = new WeakMap<ts.Node, ts.Declaration | undefined>();

  private origin: ts.Node | undefined;
  private failures = 0;
  private peakDepth = 0;
  private rootEnvironment: Environment | undefined;
  private foreignEnvironments = 0;

  constructor(
    readonly checker: ts.TypeChecker,
    private readonly problem: Problem,
  ) {}

  declaration(node: ts.Node, typeOnly = false): ts.Declaration | undefined {
    const declarations = typeOnly ? this.typeDeclarations : this.valueDeclarations;

    if (declarations.has(node)) return declarations.get(node);

    let symbol = this.checker.getSymbolAtLocation(node);

    if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
      const original = symbol;

      symbol = this.checker.getAliasedSymbol(symbol);
      if (!symbol.declarations?.length) {
        const declaration = original.declarations?.[0];

        declarations.set(node, declaration);

        return declaration;
      }
    }

    const declaration = typeOnly
      ? (symbol?.declarations?.find(
          (candidate) =>
            ts.isTypeAliasDeclaration(candidate) ||
            ts.isInterfaceDeclaration(candidate) ||
            ts.isClassDeclaration(candidate) ||
            ts.isTypeParameterDeclaration(candidate),
        ) ?? symbol?.declarations?.[0])
      : (symbol?.valueDeclaration ?? symbol?.declarations?.[0]);

    declarations.set(node, declaration);

    return declaration;
  }

  binding(binding: Binding): Shape {
    return 'node' in binding ? this.read(binding.node, binding.env) : binding;
  }

  read(node: ts.TypeNode | undefined, env: Environment = new Map()): Shape {
    if (!node) return unknown;
    if (this.active.size === 0) this.origin = node;
    if (this.active.size > 100 || this.active.has(node)) {
      this.fail(node, 'Cyclic or excessively deep range type.');

      return invalid;
    }

    let resolutions = this.resolutions.get(env);
    const cached = resolutions?.get(node);
    const { size: depth } = this.active;
    const { failures, peakDepth: previousPeak, rootEnvironment } = this;
    const consistentEnvironment =
      rootEnvironment === undefined || (rootEnvironment === env && this.foreignEnvironments === 0);

    // Preserve recursion guards across binding environments and cached subtree depths.
    if (cached && consistentEnvironment && depth + cached.depth <= 101) {
      this.peakDepth = Math.max(this.peakDepth, depth + cached.depth);

      return cached.shape;
    }

    this.active.add(node);
    this.peakDepth = depth + 1;

    if (rootEnvironment === undefined) this.rootEnvironment = env;
    else if (rootEnvironment !== env) this.foreignEnvironments += 1;

    try {
      const shape = this.resolve(node, env);

      if (this.failures === failures) {
        if (!resolutions) {
          resolutions = new WeakMap();
          this.resolutions.set(env, resolutions);
        }

        resolutions.set(node, {
          shape,
          depth: this.peakDepth - depth,
        });
      }

      return shape;
    } finally {
      this.active.delete(node);
      this.peakDepth = Math.max(previousPeak, this.peakDepth);

      if (rootEnvironment === undefined) this.rootEnvironment = undefined;
      else if (rootEnvironment !== env) this.foreignEnvironments -= 1;
    }
  }

  members(members: readonly ts.Node[], env: Environment): Extract<Shape, { kind: 'object' }> {
    const result: Extract<Shape, { kind: 'object' }> = {
      kind: 'object',
      properties: new Map(),
    };

    for (const member of members) {
      if (ts.isPropertySignature(member) || ts.isPropertyDeclaration(member)) {
        const value = this.read(member.type, env);

        result.properties.set(
          propertyName(member.name),
          member.questionToken
            ? {
                kind: 'union',
                members: [value, { kind: 'other', tag: 'undefined' }],
              }
            : value,
        );
      }
      if (ts.isMethodSignature(member) || ts.isMethodDeclaration(member))
        result.properties.set(propertyName(member.name), {
          kind: 'function',
          declaration: member,
          env,
        });
      if (ts.isGetAccessorDeclaration(member))
        result.properties.set(propertyName(member.name), this.read(member.type, env));
      if (ts.isSetAccessorDeclaration(member))
        result.properties.set(
          propertyName(member.name),
          this.read(member.parameters[0]?.type, env),
        );
      if (ts.isIndexSignatureDeclaration(member)) result.index = this.read(member.type, env);
    }

    return result;
  }

  private fail(node: ts.Node, reason: string): void {
    this.failures += 1;
    this.problem(
      node.getSourceFile() === this.origin?.getSourceFile() ? node : (this.origin ?? node),
      reason,
    );
  }

  private resolve(node: ts.TypeNode, env: Environment): Shape {
    if (ts.isParenthesizedTypeNode(node) || ts.isTypeOperatorNode(node))
      return this.read(node.type, env);
    if (ts.isLiteralTypeNode(node)) {
      if (ts.isNumericLiteral(node.literal)) return literal(Number(node.literal.text));
      if (ts.isPrefixUnaryExpression(node.literal) && ts.isNumericLiteral(node.literal.operand))
        return literal(
          (node.literal.operator === ts.SyntaxKind.MinusToken ? -1 : 1) *
            Number(node.literal.operand.text),
        );

      if (node.literal.kind === ts.SyntaxKind.NullKeyword) return { kind: 'other', tag: 'null' };
      if (ts.isStringLiteral(node.literal)) return { kind: 'other', tag: 'string' };

      return { kind: 'other', tag: 'boolean' };
    }
    if (
      [
        ts.SyntaxKind.UndefinedKeyword,
        ts.SyntaxKind.VoidKeyword,
        ts.SyntaxKind.StringKeyword,
        ts.SyntaxKind.BooleanKeyword,
      ].includes(node.kind)
    )
      return {
        kind: 'other',
        tag:
          node.kind === ts.SyntaxKind.VoidKeyword
            ? 'undefined'
            : (ts.tokenToString(node.kind) ?? 'undefined'),
      };
    if (
      node.kind === ts.SyntaxKind.NumberKeyword ||
      node.kind === ts.SyntaxKind.AnyKeyword ||
      node.kind === ts.SyntaxKind.UnknownKeyword
    )
      return unrestricted;
    if (ts.isUnionTypeNode(node)) {
      const members = node.types.map((type) => this.read(type, env));

      if (members.some((member) => member.kind === 'invalid')) return invalid;
      if (
        node.types.some(
          (type) =>
            type.kind === ts.SyntaxKind.NumberKeyword ||
            type.kind === ts.SyntaxKind.AnyKeyword ||
            type.kind === ts.SyntaxKind.UnknownKeyword,
        )
      )
        return unrestricted;
      if (
        members.every(
          (member): member is Extract<Shape, { kind: 'number' }> => member.kind === 'number',
        )
      )
        return number(
          members.flatMap((member) => member.ranges),
          members.some((member) => member.nan),
        );

      return { kind: 'union', members };
    }
    if (ts.isIntersectionTypeNode(node)) {
      const members = node.types.map((type) => this.read(type, env));

      if (
        members.every(
          (member): member is Extract<Shape, { kind: 'object' }> => member.kind === 'object',
        )
      )
        return {
          kind: 'object',
          properties: new Map(members.flatMap((member) => [...member.properties])),
        };

      return unknown;
    }
    if (ts.isArrayTypeNode(node))
      return { kind: 'array', element: this.read(node.elementType, env) };
    if (ts.isTupleTypeNode(node)) {
      const items = node.elements.map((element) =>
        this.read(ts.isNamedTupleMember(element) ? element.type : element, env),
      );

      return {
        kind: 'array',
        items,
        element: { kind: 'union', members: items },
      };
    }
    if (ts.isOptionalTypeNode(node) || ts.isRestTypeNode(node)) return this.read(node.type, env);
    if (ts.isFunctionTypeNode(node)) return { kind: 'function', declaration: node, env };
    if (ts.isTypeLiteralNode(node)) return this.members(node.members, env);
    if (!ts.isTypeReferenceNode(node)) {
      let containsRange = false;

      ts.forEachChild(node, (child) => {
        if (ts.isTypeNode(child)) {
          const shape = this.read(child, env);

          if (shape.kind === 'number' || shape.kind === 'invalid') containsRange = true;
        }
      });
      if (containsRange) {
        this.fail(node, 'This type construct cannot be used to prove a numeric range.');

        return invalid;
      }

      return unknown;
    }

    const name = node.typeName.getText();
    const bound = env.get(name);

    if (bound) return this.binding(bound);
    if (name === 'Between') {
      const args = node.typeArguments;

      if (args?.length !== 2) {
        this.fail(node, 'Between requires exactly two numeric bounds.');

        return invalid;
      }

      const values = args.map((argument) => this.read(argument, env));
      const limits = values.map((value) =>
        value.kind === 'number' &&
        !value.nan &&
        value.ranges.length === 1 &&
        value.ranges[0]?.[0] === value.ranges[0]?.[1]
          ? value.ranges[0]?.[0]
          : undefined,
      );
      const [min, max] = limits;

      if (
        min === undefined ||
        max === undefined ||
        !Number.isFinite(min) ||
        !Number.isFinite(max)
      ) {
        this.fail(node, 'Between bounds must resolve to finite numeric literals.');

        return invalid;
      }
      if (min > max) {
        this.fail(node, 'The lower bound must not exceed the upper bound.');

        return invalid;
      }

      return number([[min, max]]);
    }
    if (['Array', 'ReadonlyArray'].includes(name))
      return {
        kind: 'array',
        element: this.read(node.typeArguments?.[0], env),
      };
    if (['Promise', 'Readonly'].includes(name)) return this.read(node.typeArguments?.[0], env);
    if (name === 'Record')
      return {
        kind: 'object',
        properties: new Map(),
        index: this.read(node.typeArguments?.[1], env),
      };

    const declaration = this.declaration(node.typeName, true);

    if (declaration && ts.isTypeAliasDeclaration(declaration)) {
      const next = bindTypeParameters(declaration.typeParameters, node.typeArguments, env);

      return this.read(declaration.type, next);
    }
    if (
      declaration &&
      (ts.isInterfaceDeclaration(declaration) || ts.isClassDeclaration(declaration))
    ) {
      const next = bindTypeParameters(declaration.typeParameters, node.typeArguments, env);

      if (this.active.has(declaration)) {
        this.failures += 1;

        return unknown;
      }

      this.active.add(declaration);
      try {
        const shape = this.members(declaration.members, next);

        for (const clause of declaration.heritageClauses ?? [])
          for (const base of clause.types) {
            const parent = this.declaration(base.expression);

            if (parent && this.active.has(parent)) this.failures += 1;

            if (parent && ts.isInterfaceDeclaration(parent) && !this.active.has(parent)) {
              this.active.add(parent);
              const inherited = this.members(
                parent.members,
                bindTypeParameters(parent.typeParameters, base.typeArguments, next),
              );

              this.active.delete(parent);

              for (const [key, value] of inherited.properties)
                if (!shape.properties.has(key)) shape.properties.set(key, value);
            }
          }

        return shape;
      } finally {
        this.active.delete(declaration);
      }
    }
    if (declaration && ts.isTypeParameterDeclaration(declaration))
      return this.read(declaration.constraint, env);
    if (!declaration) {
      const builtin = getBuiltinRange(name);

      if (builtin) {
        if (node.typeArguments?.length) {
          this.fail(node, `${name} does not accept type arguments.`);

          return invalid;
        }

        return number([builtin]);
      }
    }

    return unknown;
  }
}
