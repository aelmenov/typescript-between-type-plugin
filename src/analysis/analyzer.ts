import ts from 'typescript';
import { formatRanges } from '../range.js';
import { arithmetic, covered, join, literal, number, unknown } from './domain.js';
import type { Environment, Shape } from './domain.js';
import { propertyName, Types } from './types.js';

type State = Map<ts.Declaration, Shape>;
type Message = 'outOfRange' | 'possibleOutOfRange' | 'unknownRange' | 'invalidRange';
export type Report = (node: ts.Node, message: Message, data: Record<string, string>) => void;

export function analyze(text: string, filename: string, report: Report, strict: boolean) {
  const file = ts.sys.resolvePath(filename.endsWith('.ts') || filename.endsWith('.tsx') ? filename : `${filename}.ts`);
  const config = ts.findConfigFile(file.slice(0, file.lastIndexOf('/')), ts.sys.fileExists);
  let options: ts.CompilerOptions = {};
  if (config) {
    const read = ts.readConfigFile(config, ts.sys.readFile);
    if (!read.error) options = ts.parseJsonConfigFileContent(read.config, ts.sys, config.slice(0, config.lastIndexOf('/'))).options;
  }
  options = { ...options, noLib: true, types: [], noEmit: true, skipLibCheck: true };
  const host = ts.createCompilerHost(options, true);
  const getSourceFile = host.getSourceFile.bind(host);
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  host.getSourceFile = (name, languageVersion, onError, fresh) => ts.sys.resolvePath(name) === file ? source : getSourceFile(name, languageVersion, onError, fresh);
  const program = ts.createProgram([file], options, host);
  new Analyzer(source, program.getTypeChecker(), report, strict).run();
}

class Analyzer {
  private types: Types;
  private reported = new Set<string>();
  private evaluating = new Set<ts.Node>();
  private functions = new Set<ts.Node>();
  private inferred = new Map<ts.Node, Shape>();
  private captured: Shape[] = [];
  private returns: Shape = unknown;
  private env: Environment = new Map();
  constructor(private source: ts.SourceFile, checker: ts.TypeChecker, private report: Report, private strict: boolean) {
    this.types = new Types(checker, (node, reason) => this.emit(node, 'invalidRange', { reason }));
  }
  private emit(node: ts.Node, message: Message, data: Record<string, string>) {
    if (node.getSourceFile() !== this.source) return;
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)) node = node.expression;
    const key = `${node.pos}:${node.end}:${message}:${JSON.stringify(data)}`;
    if (this.reported.has(key)) return;
    this.reported.add(key); this.report(node, message, data);
  }
  run() { this.statements(this.source.statements, new Map()); }
  private constrained(shape: Shape, seen = new Set<ts.Node>()): boolean {
    switch (shape.kind) {
      case 'number': case 'invalid': return true;
      case 'function': {
        if (seen.has(shape.declaration)) return false;
        seen.add(shape.declaration);
        return [shape.declaration.type, ...shape.declaration.parameters.map(parameter => parameter.type)].some(type => this.constrained(this.types.read(type, shape.env), seen));
      }
      case 'object': return [...shape.properties.values(), ...(shape.index ? [shape.index] : [])].some(value => this.constrained(value, seen));
      case 'array': return this.constrained(shape.element, seen);
      case 'union': return shape.members.some(value => this.constrained(value, seen));
      default: return false;
    }
  }
  private acceptable(target: Shape, value: Shape): boolean {
    if (target.kind === 'other') return value.kind === 'other' && value.tag === target.tag;
    if (!this.constrained(target)) return true;
    if (target.kind === 'number' && value.kind === 'number') return !value.nan && value.ranges.every(range => covered(range, target.ranges));
    if (target.kind === 'union') return target.members.some(member => member.kind !== 'unknown' && this.acceptable(member, value));
    return false;
  }
  private check(target: Shape, value: Shape, node: ts.Node) {
    if (target.kind === 'function' && value.kind === 'function' && ts.isFunctionLike(value.declaration) && 'body' in value.declaration) {
      this.functionBody(value.declaration as ts.FunctionLikeDeclaration, new Map(), target); return;
    }
    if (!this.constrained(target) || target.kind === 'invalid') return;
    if (target.kind === 'union') {
      if (!this.acceptable(target, value)) {
        const numeric = target.members.filter((member): member is Extract<Shape, {kind: 'number'}> => member.kind === 'number');
        if (numeric.length) this.check(number(numeric.flatMap(member => member.ranges)), value, node);
        else if (this.strict) this.emit(node, 'unknownRange', {});
      }
      return;
    }
    if (target.kind === 'number') {
      if (value.kind !== 'number') { if (this.strict) this.emit(node, 'unknownRange', {}); return; }
      if (this.acceptable(target, value)) return;
      const singleton = value.ranges.length === 1 && value.ranges[0]?.[0] === value.ranges[0]?.[1] && !value.nan;
      const entirelyOutside = value.ranges.every(([a, b]) => target.ranges.every(([c, d]) => b < c || a > d));
      const display = singleton ? String(value.ranges[0]?.[0]) : value.ranges.length ? formatRanges(value.ranges) : 'NaN';
      this.emit(node, entirelyOutside ? 'outOfRange' : 'possibleOutOfRange', { value: display, range: formatRanges(target.ranges) });
      return;
    }
    if (target.kind === 'array') {
      if (value.kind !== 'array') { if (this.strict) this.emit(node, 'unknownRange', {}); return; }
      if (value.items) value.items.forEach((item, index) => this.check(target.items?.[index] ?? target.element, item,
        ts.isArrayLiteralExpression(node) ? node.elements[index] ?? node : node));
      else this.check(target.element, value.element, node);
      return;
    }
    if (target.kind === 'object') {
      if (value.kind !== 'object') { if (this.strict) this.emit(node, 'unknownRange', {}); return; }
      for (const [name, property] of target.properties) {
        const child = ts.isObjectLiteralExpression(node) ? node.properties.find(p => p.name && propertyName(p.name) === name) : undefined;
        const location = child && ts.isPropertyAssignment(child) ? child.initializer : node;
        this.check(property, value.properties.get(name) ?? {kind: 'other', tag: 'undefined'}, location);
      }
      if (target.index) for (const [name, property] of value.properties) {
        if (!target.properties.has(name)) this.check(target.index, property, node);
      }
    }
  }
  private declared(declaration: ts.Declaration | undefined): Shape {
    if (!declaration) return unknown;
    if (ts.isBindingElement(declaration)) {
      const pattern = declaration.parent;
      const parent = pattern.parent;
      const key = ts.isArrayBindingPattern(pattern) ? String(pattern.elements.indexOf(declaration)) : declaration.propertyName ? propertyName(declaration.propertyName) : declaration.name.getText();
      if (ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isBindingElement(parent)) return this.member(this.declared(parent), key);
    }
    if (ts.isVariableDeclaration(declaration) || ts.isParameter(declaration) || ts.isPropertyDeclaration(declaration) || ts.isPropertySignature(declaration) || ts.isBindingElement(declaration)) {
      if ('type' in declaration) return this.types.read(declaration.type, this.env);
    }
    if (ts.isGetAccessorDeclaration(declaration)) return this.types.read(declaration.type, this.env);
    if (ts.isSetAccessorDeclaration(declaration)) return this.types.read(declaration.parameters[0]?.type, this.env);
    if (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration) || ts.isMethodSignature(declaration)) return { kind: 'function', declaration, env: this.env };
    return unknown;
  }
  private target(node: ts.Expression): Shape {
    if (ts.isIdentifier(node)) return this.declared(this.types.declaration(node));
    if (node.kind === ts.SyntaxKind.ThisKeyword) return this.value(node, new Map());
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const object = this.target(node.expression);
      const member = this.member(object, this.key(node));
      return member.kind === 'unknown' ? this.declared(this.types.declaration(node)) : member;
    }
    return unknown;
  }
  private key(node: ts.PropertyAccessExpression | ts.ElementAccessExpression): string | undefined {
    if (ts.isPropertyAccessExpression(node)) return node.name.text;
    const key = node.argumentExpression;
    return ts.isStringLiteral(key) || ts.isNumericLiteral(key) ? key.text : undefined;
  }
  private member(shape: Shape, key: string | undefined): Shape {
    if (shape.kind === 'object') return (key === undefined ? undefined : shape.properties.get(key)) ?? shape.index ?? unknown;
    if (shape.kind === 'array') {
      if (key === 'length') return shape.items ? literal(shape.items.length) : number([[0, 4294967295]]);
      if (key !== undefined && !/^\d+$/.test(key)) return unknown;
      return key !== undefined && shape.items?.[Number(key)] || shape.element;
    }
    return unknown;
  }
  private value(node: ts.Expression, state: State): Shape {
    if (this.evaluating.has(node)) return unknown;
    this.evaluating.add(node);
    try { return this.expression(node, state); } finally { this.evaluating.delete(node); }
  }
  private expression(node: ts.Expression, state: State): Shape {
    if (ts.isNumericLiteral(node)) return literal(Number(node.text));
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { kind: 'other', tag: 'string' };
    if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return { kind: 'other', tag: 'boolean' };
    if (node.kind === ts.SyntaxKind.NullKeyword) return { kind: 'other', tag: 'null' };
    if (ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node) || ts.isAwaitExpression(node)) return this.value(node.expression, state);
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)) {
      const value = this.value(node.expression, state);
      this.check(this.types.read(node.type, this.env), value, node.expression);
      return value;
    }
    if (ts.isIdentifier(node)) {
      const declaration = this.types.declaration(node);
      if (!declaration && node.text === 'undefined') return { kind: 'other', tag: 'undefined' };
      if (!declaration) return node.text === 'Infinity' ? literal(Infinity) : node.text === 'NaN' ? literal(NaN) : unknown;
      const stored = state.get(declaration);
      if (stored) {
        const contract = this.declared(declaration);
        return stored.kind === 'function' && contract.kind === 'function' ? contract : stored;
      }
      if (ts.isVariableDeclaration(declaration) && declaration.initializer && (declaration.parent.flags & ts.NodeFlags.Const)) return this.value(declaration.initializer, state);
      return this.declared(declaration);
    }
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      this.functionBody(node, state); return { kind: 'function', declaration: node, env: this.env };
    }
    if (ts.isObjectLiteralExpression(node)) {
      const properties = new Map<string, Shape>();
      for (const property of node.properties) {
        if (ts.isPropertyAssignment(property)) properties.set(propertyName(property.name), this.value(property.initializer, state));
        if (ts.isShorthandPropertyAssignment(property)) properties.set(property.name.text, this.value(property.name, state));
        if (ts.isMethodDeclaration(property)) { this.functionBody(property, state); properties.set(propertyName(property.name), { kind: 'function', declaration: property, env: this.env }); }
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
          if (spread.kind !== 'array' || !spread.items) return { kind: 'array', element: unknown };
          items.push(...spread.items);
        } else items.push(ts.isOmittedExpression(element) ? unknown : this.value(element, state));
      }
      return { kind: 'array', items, element: items.reduce(join, items[0] ?? unknown) };
    }
    if (node.kind === ts.SyntaxKind.ThisKeyword) {
      for (let parent: ts.Node | undefined = node.parent; parent; parent = parent.parent) {
        if (ts.isClassDeclaration(parent)) return this.types.members(parent.members, this.env);
      }
      return unknown;
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const member = this.member(this.value(node.expression, state), this.key(node));
      let root = node.expression;
      while (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root)) root = root.expression;
      const declaration = this.types.declaration(root);
      if (declaration && state.has(declaration)) return member;
      return member.kind === 'unknown' ? this.declared(this.types.declaration(node)) : member;
    }
    if (ts.isConditionalExpression(node)) {
      this.value(node.condition, state);
      const yes = this.narrow(node.condition, true, state), no = this.narrow(node.condition, false, state);
      const result = join(this.value(node.whenTrue, yes), this.value(node.whenFalse, no));
      this.merge(state, yes, no); return result;
    }
    if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
      const operand = this.value(node.operand, state);
      if (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) {
        const next = arithmetic(node.operator === ts.SyntaxKind.PlusPlusToken ? '+' : '-', operand, literal(1));
        this.assign(node.operand, next, node, state); return ts.isPostfixUnaryExpression(node) ? operand : next;
      }
      if (node.operator === ts.SyntaxKind.PlusToken) return operand;
      if (node.operator === ts.SyntaxKind.MinusToken) return arithmetic('*', literal(-1), operand);
      if (node.operator === ts.SyntaxKind.TildeToken) return arithmetic('^', operand, literal(-1));
      return unknown;
    }
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      if (op === ts.SyntaxKind.EqualsToken) {
        const result = this.value(node.right, state); this.assign(node.left, result, node.right, state); return result;
      }
      if (op >= ts.SyntaxKind.FirstCompoundAssignment && op <= ts.SyntaxKind.LastCompoundAssignment) {
        const operator = node.operatorToken.getText().slice(0, -1);
        const result = arithmetic(operator, this.value(node.left, state), this.value(node.right, state));
        this.assign(node.left, result, node, state); return result;
      }
      if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) {
        this.value(node.left, state);
        const branch = this.narrow(node.left, op === ts.SyntaxKind.AmpersandAmpersandToken, state);
        this.value(node.right, branch); this.merge(state, state, branch); return unknown;
      }
      const left = this.value(node.left, state), right = this.value(node.right, state);
      if (op === ts.SyntaxKind.CommaToken) return right;
      if ([ts.SyntaxKind.LessThanToken, ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.LessThanEqualsToken, ts.SyntaxKind.GreaterThanEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(op)) return unknown;
      return arithmetic(node.operatorToken.getText(), left, right);
    }
    if (ts.isNewExpression(node)) {
      const declaration = this.types.declaration(node.expression);
      if (declaration && ts.isClassDeclaration(declaration)) {
        const env = this.types.bind(declaration.typeParameters, node.typeArguments, this.env);
        const constructor = declaration.members.find(ts.isConstructorDeclaration);
        node.arguments?.forEach((argument, index) => this.check(this.types.read(constructor?.parameters[index]?.type, env), this.value(argument, state), argument));
        return this.types.members(declaration.members, env);
      }
    }
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const fn = this.value(node.expression, state);
      const args: Shape[] = [];
      for (const argument of node.arguments ?? []) {
        if (ts.isSpreadElement(argument)) {
          const spread = this.value(argument.expression, state);
          if (spread.kind === 'array' && spread.items) args.push(...spread.items);
          else args.push(unknown);
        } else args.push(this.value(argument, state));
      }
      if (ts.isPropertyAccessExpression(node.expression) && ['push', 'unshift', 'splice', 'fill'].includes(node.expression.name.text)) {
        const array = this.target(node.expression.expression);
        if (array.kind === 'array') {
          const start = node.expression.name.text === 'splice' ? 2 : 0;
          const end = node.expression.name.text === 'fill' ? 1 : args.length;
          args.slice(start, end).forEach((value, index) => this.check(array.element, value, node.arguments?.[start + index] ?? node));
        }
      }
      let result: Shape = unknown;
      if (fn.kind === 'function') {
        const env = this.types.bind(fn.declaration.typeParameters, node.typeArguments, fn.env);
        fn.declaration.parameters.forEach((parameter, index) => {
          const target = this.types.read(parameter.type, env);
          if (parameter.dotDotDotToken && target.kind === 'array') args.slice(index).forEach((value, offset) => this.check(target.element, value, node.arguments?.[index + offset] ?? node));
          else if (index < args.length) this.check(target, args[index] ?? unknown, node.arguments?.[index] ?? node);
        });
        result = this.types.read(fn.declaration.type, env);
        if (!fn.declaration.type && 'body' in fn.declaration) {
          this.functionBody(fn.declaration as ts.FunctionLikeDeclaration, state);
          result = this.inferred.get(fn.declaration) ?? unknown;
        }
      }
      // Unknown side effects can invalidate both narrowed variables and aggregate values.
      for (const declaration of state.keys()) if (!this.immutable(declaration) || ['object', 'array'].includes(state.get(declaration)?.kind ?? '')) state.set(declaration, unknown);
      return result;
    }
    ts.forEachChild(node, child => { if (ts.isExpression(child)) this.value(child, state); });
    return unknown;
  }
  private immutable(declaration: ts.Declaration): boolean {
    return ts.isVariableDeclaration(declaration) && !!(declaration.parent.flags & ts.NodeFlags.Const);
  }
  private assign(node: ts.Expression, value: Shape, location: ts.Node, state: State) {
    if (ts.isArrayLiteralExpression(node)) {
      node.elements.forEach((element, index) => { if (!ts.isOmittedExpression(element)) this.assign(element, this.member(value, String(index)), location, state); }); return;
    }
    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (ts.isShorthandPropertyAssignment(property)) this.assign(property.name, this.member(value, property.name.text), location, state);
        if (ts.isPropertyAssignment(property)) this.assign(property.initializer, this.member(value, propertyName(property.name)), location, state);
      }
      return;
    }
    if (ts.isElementAccessExpression(node) && this.key(node) === undefined) {
      const container = this.target(node.expression);
      if (container.kind === 'array' && container.items) container.items.forEach(item => this.check(item, value, location));
      else this.check(this.target(node), value, location);
    } else this.check(this.target(node), value, location);
    if (ts.isIdentifier(node)) {
      const declaration = this.types.declaration(node);
      if (declaration) state.set(declaration, value);
    } else if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      // Invalidate aggregate aliases after mutation rather than retaining stale facts.
      for (const [key, item] of state) if (item.kind === 'object' || item.kind === 'array') state.set(key, unknown);
    }
  }
  private narrow(test: ts.Expression, truth: boolean, original: State): State {
    const state = new Map(original);
    if (ts.isParenthesizedExpression(test)) return this.narrow(test.expression, truth, state);
    if (ts.isPrefixUnaryExpression(test) && test.operator === ts.SyntaxKind.ExclamationToken) return this.narrow(test.operand, !truth, state);
    if (ts.isCallExpression(test) && ts.isPropertyAccessExpression(test.expression) &&
      ts.isIdentifier(test.expression.expression) && test.expression.expression.text === 'Number' &&
      !this.types.declaration(test.expression.expression) && test.arguments.length === 1 && truth &&
      test.expression.name.text === 'isFinite') {
      const argument = test.arguments[0];
      if (argument && ts.isIdentifier(argument)) {
        const declaration = this.types.declaration(argument);
        if (declaration) state.set(declaration, number([[-Number.MAX_VALUE, Number.MAX_VALUE]]));
      }
      return state;
    }
    if (!ts.isBinaryExpression(test)) return state;
    if (ts.isTypeOfExpression(test.left) && ts.isIdentifier(test.left.expression) &&
      ts.isStringLiteral(test.right) && test.right.text === 'number' &&
      ((test.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken && truth) ||
       (test.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken && !truth))) {
      const declaration = this.types.declaration(test.left.expression);
      if (declaration) state.set(declaration, number([[-Infinity, Infinity]], true));
      return state;
    }
    const token = test.operatorToken.kind;
    if (token === ts.SyntaxKind.AmpersandAmpersandToken || token === ts.SyntaxKind.BarBarToken) {
      const and = token === ts.SyntaxKind.AmpersandAmpersandToken;
      if (truth === and) return this.narrow(test.right, truth, this.narrow(test.left, truth, state));
      const left = this.narrow(test.left, truth, state);
      const right = this.narrow(test.right, truth, this.narrow(test.left, !truth, state));
      this.merge(state, left, right); return state;
    }
    let identifier = test.left, bound = test.right, operator = test.operatorToken.getText();
    if (!ts.isIdentifier(identifier) && ts.isIdentifier(bound)) {
      [identifier, bound] = [bound, identifier];
      operator = ({ '<': '>', '>': '<', '<=': '>=', '>=': '<=', '===': '===', '!==': '!==' } as Record<string, string>)[operator] ?? '';
    }
    if (!ts.isIdentifier(identifier)) return state;
    const declaration = this.types.declaration(identifier);
    const limit = this.value(bound, new Map(state));
    const currentValue = this.value(identifier, state);
    const declaredNumeric = this.declared(declaration).kind === 'number' || (this.types.checker.getTypeAtLocation(identifier).flags & ts.TypeFlags.NumberLike) !== 0;
    if (currentValue.kind !== 'number' && !declaredNumeric) return state;
    if (!declaration || limit.kind !== 'number' || limit.nan || limit.ranges.length !== 1 || limit.ranges[0]?.[0] !== limit.ranges[0]?.[1]) return state;
    const point = limit.ranges[0]?.[0];
    if (point === undefined || Number.isNaN(point)) return state;
    if (!truth) operator = ({ '<': '>=', '<=': '>', '>': '<=', '>=': '<', '===': '!==', '!==': '===' } as Record<string, string>)[operator] ?? '';
    let low = -Infinity, high = Infinity;
    if (operator === '<' || operator === '<=') high = point;
    else if (operator === '>' || operator === '>=') low = point;
    else if (operator === '===') low = high = point;
    else return state;
    const current = this.value(identifier, state);
    const ranges = current.kind === 'number' ? current.ranges : [[-Infinity, Infinity] as const];
    // False ordered comparisons may include NaN. Keep it until a positive comparison excludes it.
    const nan = !truth && !['===', '!=='].includes(test.operatorToken.getText()) && (current.kind !== 'number' || current.nan);
    state.set(declaration, number(ranges.map(([a, b]) => [Math.max(a, low), Math.min(b, high)] as const).filter(([a, b]) => a <= b), nan));
    return state;
  }
  private merge(target: State, a: State, b: State) {
    const entries = new Map<ts.Declaration, Shape>();
    for (const declaration of new Set([...a.keys(), ...b.keys()])) entries.set(declaration, join(a.get(declaration) ?? this.declared(declaration), b.get(declaration) ?? this.declared(declaration)));
    target.clear(); for (const entry of entries) target.set(...entry);
  }
  private bind(name: ts.BindingName, value: Shape, target: Shape, state: State, declaration: ts.Declaration) {
    if (ts.isIdentifier(name)) { state.set(declaration, value); return; }
    name.elements.forEach((element, index) => {
      if (ts.isOmittedExpression(element)) return;
      const key = ts.isArrayBindingPattern(name) ? String(index) : element.propertyName ? propertyName(element.propertyName) : element.name.getText();
      let item = this.member(value, key);
      if (element.initializer) { const fallback = this.value(element.initializer, state); this.check(this.member(target, key), fallback, element.initializer); item = join(item, fallback); }
      this.bind(element.name, item, this.member(target, key), state, element);
    });
  }
  private functionBody(node: ts.FunctionLikeDeclaration, outer: State, contextual?: Extract<Shape, { kind: 'function' }>) {
    if ((this.functions.has(node) && !contextual) || !node.body) return;
    this.functions.add(node);
    const previousReturn = this.returns, previousEnv = this.env, previousCaptured = this.captured;
    this.captured = [];
    this.env = this.types.bind(node.typeParameters, undefined, this.env);
    this.returns = this.types.read(node.type, this.env);
    if (!node.type && contextual) this.returns = this.types.read(contextual.declaration.type, contextual.env);
    const state = new Map<ts.Declaration, Shape>();
    for (const [declaration, value] of outer) state.set(declaration, this.immutable(declaration) && value.kind === 'number' ? value : this.declared(declaration));
    for (const [index, parameter] of node.parameters.entries()) {
      const shape = parameter.type ? this.types.read(parameter.type, this.env) : contextual ? this.types.read(contextual.declaration.parameters[index]?.type, contextual.env) : unknown;
      if (parameter.initializer) this.check(shape, this.value(parameter.initializer, state), parameter.initializer);
      this.bind(parameter.name, shape.kind === 'any' ? unknown : shape, shape, state, parameter);
    }
    if (ts.isBlock(node.body)) {
      const fallsThrough = this.statements(node.body.statements, state);
      if (fallsThrough) { const missing: Shape = {kind: 'other', tag: 'undefined'}; this.captured.push(missing); this.check(this.returns, missing, node); }
    }
    else { const value = this.value(node.body, state); this.captured.push(value); this.check(this.returns, value, node.body); }
    this.inferred.set(node, this.captured.reduce(join, this.captured[0] ?? unknown));
    this.returns = previousReturn; this.env = previousEnv; this.captured = previousCaptured;
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
        const value = declaration.initializer ? this.value(declaration.initializer, state) : unknown;
        if (declaration.initializer) this.check(target, value, declaration.initializer);
        this.bind(declaration.name, value, target, state, declaration);
      }
    } else if (ts.isExpressionStatement(node)) this.value(node.expression, state);
    else if (ts.isReturnStatement(node)) {
      const value = node.expression ? this.value(node.expression, state) : unknown;
      this.captured.push(value); this.check(this.returns, value, node.expression ?? node); return false;
    } else if (ts.isThrowStatement(node)) { this.value(node.expression, state); return false; }
    else if (ts.isIfStatement(node)) {
      this.value(node.expression, state);
      const yes = this.narrow(node.expression, true, state), no = this.narrow(node.expression, false, state);
      const yesAlive = this.statement(node.thenStatement, yes), noAlive = node.elseStatement ? this.statement(node.elseStatement, no) : true;
      if (yesAlive && noAlive) this.merge(state, yes, no);
      else if (yesAlive || noAlive) { state.clear(); for (const entry of yesAlive ? yes : no) state.set(...entry); }
      return yesAlive || noAlive;
    } else if (ts.isFunctionDeclaration(node)) this.functionBody(node, state);
    else if (ts.isTypeAliasDeclaration(node)) {
      if (!node.typeParameters?.length) this.types.read(node.type, this.env);
    } else if (ts.isInterfaceDeclaration(node)) this.types.members(node.members, this.types.bind(node.typeParameters, undefined, this.env));
    else if (ts.isClassDeclaration(node)) {
      for (const member of node.members) {
        if (ts.isPropertyDeclaration(member)) { const target = this.types.read(member.type, this.env); if (member.initializer) this.check(target, this.value(member.initializer, state), member.initializer); }
        if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) this.functionBody(member, state);
      }
    } else if (ts.isWhileStatement(node) || ts.isDoStatement(node) || ts.isForStatement(node) || ts.isForOfStatement(node) || ts.isForInStatement(node)) {
      if (ts.isForStatement(node) && node.initializer) {
        if (ts.isVariableDeclarationList(node.initializer)) for (const declaration of node.initializer.declarations) {
          const value = declaration.initializer ? this.value(declaration.initializer, state) : unknown;
          this.check(this.types.read(declaration.type, this.env), value, declaration.initializer ?? declaration);
          this.bind(declaration.name, value, this.types.read(declaration.type, this.env), state, declaration);
        } else this.value(node.initializer, state);
      }
      const before = new Map(state);
      // A single iteration cannot prove loop invariants. Widen values before analyzing the body.
      for (const declaration of state.keys()) if (!this.immutable(declaration)) state.set(declaration, this.declared(declaration));
      const condition = ts.isForStatement(node) ? node.condition : ts.isWhileStatement(node) || ts.isDoStatement(node) ? node.expression : undefined;
      const body = condition ? this.narrow(condition, true, state) : new Map(state);
      if (ts.isForOfStatement(node) && ts.isVariableDeclarationList(node.initializer)) {
        const collection = this.value(node.expression, state);
        for (const declaration of node.initializer.declarations) this.bind(declaration.name, collection.kind === 'array' ? collection.element : unknown, this.types.read(declaration.type, this.env), body, declaration);
      }
      this.statement(node.statement, body);
      if (ts.isForStatement(node) && node.incrementor) this.value(node.incrementor, body);
      this.merge(state, before, body);
    } else {
      // Unmodeled control flow must not preserve stale proofs.
      for (const declaration of state.keys()) if (!this.immutable(declaration)) state.set(declaration, unknown);
      const visit = (child: ts.Node) => {
        if (ts.isStatement(child)) this.statement(child, new Map(state));
        else if (ts.isExpression(child)) this.value(child, state);
        else ts.forEachChild(child, visit);
      };
      ts.forEachChild(node, visit);
    }
    return true;
  }
}
