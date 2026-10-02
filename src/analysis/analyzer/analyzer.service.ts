import ts from 'typescript';
import { join, unknown } from '../domain/domain.util.js';
import { readMember } from '../domain/member.util.js';
import { narrowCondition } from '../flow/narrowing.util.js';
import { isImmutable, mergeStates } from '../domain/state.util.js';
import { bindingKey } from '../syntax.util.js';
import { createAnalysisProgram } from '../program/program.factory.js';
import { Diagnostics } from '../validation/diagnostics.service.js';
import { ExpressionEvaluator } from '../evaluator/expression-evaluator.service.js';
import { RangeChecker } from '../validation/range-checker.service.js';
import { TypeResolver } from '../type-resolver/type-resolver.service.js';
import { bindTypeParameters } from '../type-resolver/bindings.util.js';
import type { Environment, Shape } from '../domain/domain.types.js';
import type { Report, State, UnknownValues } from './analyzer.types.js';

class Analyzer {
  private readonly types: TypeResolver;
  private readonly expressions: ExpressionEvaluator;
  private readonly ranges: RangeChecker;

  private readonly analyzedFunctions = new Set<ts.Node>();
  private readonly inferredReturns = new Map<ts.Node, Shape>();

  private returnValues: Shape[] = [];
  private returns: Shape = unknown;
  private env: Environment = new Map();

  constructor(
    private readonly source: ts.SourceFile,
    checker: ts.TypeChecker,
    report: Report,
    unknownValues: UnknownValues,
  ) {
    const diagnostics = new Diagnostics(source, report, unknownValues);

    this.types = new TypeResolver(checker, (node, reason) =>
      diagnostics.emit(node, 'invalidRange', { reason }),
    );
    this.ranges = new RangeChecker(this.types, diagnostics, (node, outer, contextual) =>
      this.analyzeFunction(node, outer, contextual),
    );
    this.expressions = new ExpressionEvaluator(
      this.types,
      () => this.env,
      (target, value, node) => this.ranges.check(target, value, node),
      (node, outer, contextual) => this.analyzeFunction(node, outer, contextual),
    );
  }

  run(): void {
    this.statements(this.source.statements, new Map());
  }

  private bind(
    name: ts.BindingName,
    value: Shape,
    target: Shape,
    state: State,
    declaration: ts.Declaration,
  ) {
    if (ts.isIdentifier(name)) {
      state.set(declaration, value);
      return;
    }

    name.elements.forEach((element) => {
      if (ts.isOmittedExpression(element)) return;

      const key = bindingKey(element);
      let item = readMember(value, key);

      if (element.initializer) {
        const fallback = this.expressions.value(element.initializer, state);

        this.ranges.check(readMember(target, key), fallback, element.initializer);
        item = join(item, fallback);
      }

      this.bind(element.name, item, readMember(target, key), state, element);
    });
  }

  private analyzeFunction(
    node: ts.FunctionLikeDeclaration,
    outer: State,
    contextual?: Extract<Shape, { kind: 'function' }>,
  ): Shape {
    if ((this.analyzedFunctions.has(node) && !contextual) || !node.body)
      return this.inferredReturns.get(node) ?? unknown;

    this.analyzedFunctions.add(node);

    const previousReturn = this.returns;
    const previousEnv = this.env;
    const previousCaptured = this.returnValues;

    this.returnValues = [];
    this.env = bindTypeParameters(node.typeParameters, undefined, this.env);
    this.returns = this.types.read(node.type, this.env);
    if (!node.type && contextual)
      this.returns = this.types.read(contextual.declaration.type, contextual.env);

    const state = new Map<ts.Declaration, Shape>();

    for (const [declaration, value] of outer)
      state.set(
        declaration,
        isImmutable(declaration) && value.kind === 'number'
          ? value
          : this.expressions.declared(declaration),
      );

    for (const [index, parameter] of node.parameters.entries()) {
      let shape: Shape = unknown;

      if (parameter.type) shape = this.types.read(parameter.type, this.env);
      else if (contextual)
        shape = this.types.read(contextual.declaration.parameters[index]?.type, contextual.env);

      if (parameter.initializer)
        this.ranges.check(
          shape,
          this.expressions.value(parameter.initializer, state),
          parameter.initializer,
        );

      this.bind(parameter.name, shape.kind === 'any' ? unknown : shape, shape, state, parameter);
    }

    if (ts.isBlock(node.body)) {
      const fallsThrough = this.statements(node.body.statements, state);

      if (fallsThrough) {
        const missing: Shape = { kind: 'other', tag: 'undefined' };

        this.returnValues.push(missing);
        this.ranges.check(this.returns, missing, node);
      }
    } else {
      const value = this.expressions.value(node.body, state);

      this.returnValues.push(value);
      this.ranges.check(this.returns, value, node.body);
    }

    const inferredReturn = this.returnValues.reduce(join, this.returnValues[0] ?? unknown);

    this.inferredReturns.set(node, inferredReturn);
    this.returns = previousReturn;
    this.env = previousEnv;
    this.returnValues = previousCaptured;

    return inferredReturn;
  }

  private statements(statements: readonly ts.Statement[], state: State): boolean {
    for (const statement of statements) if (!this.statement(statement, state)) return false;

    return true;
  }

  private statement(node: ts.Statement, state: State): boolean {
    if (ts.isBlock(node)) return this.statements(node.statements, state);

    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        const target = this.types.read(declaration.type, this.env);
        const value = declaration.initializer
          ? this.expressions.value(declaration.initializer, state)
          : unknown;

        if (declaration.initializer) this.ranges.check(target, value, declaration.initializer);

        this.bind(declaration.name, value, target, state, declaration);
      }
    } else if (ts.isExpressionStatement(node)) this.expressions.value(node.expression, state);
    else if (ts.isReturnStatement(node)) {
      const value = node.expression ? this.expressions.value(node.expression, state) : unknown;

      this.returnValues.push(value);
      this.ranges.check(this.returns, value, node.expression ?? node);

      return false;
    } else if (ts.isThrowStatement(node)) {
      this.expressions.value(node.expression, state);

      return false;
    } else if (ts.isIfStatement(node)) {
      this.expressions.value(node.expression, state);

      const yes = narrowCondition(this.expressions, node.expression, true, state);
      const no = narrowCondition(this.expressions, node.expression, false, state);
      const yesAlive = this.statement(node.thenStatement, yes);
      const noAlive = node.elseStatement ? this.statement(node.elseStatement, no) : true;

      if (yesAlive && noAlive) mergeStates(this.expressions, state, yes, no);
      else if (yesAlive || noAlive) {
        state.clear();

        for (const entry of yesAlive ? yes : no) state.set(...entry);
      }

      return yesAlive || noAlive;
    } else if (ts.isFunctionDeclaration(node)) this.analyzeFunction(node, state);
    else if (ts.isTypeAliasDeclaration(node)) {
      if (!node.typeParameters?.length) this.types.read(node.type, this.env);
    } else if (ts.isInterfaceDeclaration(node))
      this.types.members(
        node.members,
        bindTypeParameters(node.typeParameters, undefined, this.env),
      );
    else if (ts.isClassDeclaration(node)) {
      for (const member of node.members) {
        if (ts.isPropertyDeclaration(member)) {
          const target = this.types.read(member.type, this.env);

          if (member.initializer)
            this.ranges.check(
              target,
              this.expressions.value(member.initializer, state),
              member.initializer,
            );
        }
        if (
          ts.isMethodDeclaration(member) ||
          ts.isConstructorDeclaration(member) ||
          ts.isGetAccessorDeclaration(member) ||
          ts.isSetAccessorDeclaration(member)
        )
          this.analyzeFunction(member, state);
      }
    } else if (
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node) ||
      ts.isForStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isForInStatement(node)
    ) {
      if (ts.isForStatement(node) && node.initializer) {
        if (ts.isVariableDeclarationList(node.initializer))
          for (const declaration of node.initializer.declarations) {
            const value = declaration.initializer
              ? this.expressions.value(declaration.initializer, state)
              : unknown;

            this.ranges.check(
              this.types.read(declaration.type, this.env),
              value,
              declaration.initializer ?? declaration,
            );
            this.bind(
              declaration.name,
              value,
              this.types.read(declaration.type, this.env),
              state,
              declaration,
            );
          }
        else this.expressions.value(node.initializer, state);
      }

      const before = new Map(state);

      // A single iteration cannot prove loop invariants. Widen values before analyzing the body.
      for (const declaration of state.keys())
        if (!isImmutable(declaration))
          state.set(declaration, this.expressions.declared(declaration));

      let condition: ts.Expression | undefined;

      if (ts.isForStatement(node)) condition = node.condition;
      else if (ts.isWhileStatement(node) || ts.isDoStatement(node)) condition = node.expression;

      const body = condition
        ? narrowCondition(this.expressions, condition, true, state)
        : new Map(state);

      if (ts.isForOfStatement(node) && ts.isVariableDeclarationList(node.initializer)) {
        const collection = this.expressions.value(node.expression, state);

        for (const declaration of node.initializer.declarations)
          this.bind(
            declaration.name,
            collection.kind === 'array' ? collection.element : unknown,
            this.types.read(declaration.type, this.env),
            body,
            declaration,
          );
      }

      this.statement(node.statement, body);
      if (ts.isForStatement(node) && node.incrementor)
        this.expressions.value(node.incrementor, body);

      mergeStates(this.expressions, state, before, body);
    } else {
      for (const declaration of state.keys())
        if (!isImmutable(declaration)) state.set(declaration, unknown);

      const visit = (child: ts.Node) => {
        if (ts.isStatement(child)) this.statement(child, new Map(state));
        else if (ts.isExpression(child)) this.expressions.value(child, state);
        else ts.forEachChild(child, visit);
      };

      ts.forEachChild(node, visit);
    }

    return true;
  }
}

export function analyze(
  text: string,
  filename: string,
  report: Report,
  unknownValues: UnknownValues,
): void {
  const { source, checker } = createAnalysisProgram(text, filename);

  new Analyzer(source, checker, report, unknownValues).run();
}
