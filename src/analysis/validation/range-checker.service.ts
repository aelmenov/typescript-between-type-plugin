import ts from 'typescript';
import { formatRanges, intersectingRange, mergeRanges } from '../../ranges/range.util.js';
import { number } from '../domain/domain.util.js';
import { isFunctionImplementation, propertyName } from '../syntax.util.js';
import type { Shape } from '../domain/domain.types.js';
import type { AnalyzeFunction } from '../analyzer/analyzer.types.js';
import type { TypeResolver } from '../type-resolver/type-resolver.service.js';
import type { Diagnostics } from './diagnostics.service.js';
import type { Range } from '../../ranges/range.types.js';

export class RangeChecker {
  private readonly mergedRanges = new WeakMap<Range[], Range[]>();
  private readonly objectProperties = new WeakMap<
    ts.ObjectLiteralExpression,
    Map<string, ts.ObjectLiteralElementLike>
  >();

  constructor(
    private readonly types: TypeResolver,
    private readonly diagnostics: Diagnostics,
    private readonly analyzeFunction: AnalyzeFunction,
  ) {}

  check(target: Shape, value: Shape, node: ts.Node): void {
    if (
      target.kind === 'function' &&
      value.kind === 'function' &&
      isFunctionImplementation(value.declaration)
    ) {
      this.analyzeFunction(value.declaration, new Map(), target);

      return;
    }
    if (!this.constrained(target) || target.kind === 'invalid') return;
    if (target.kind === 'union') {
      if (!this.acceptable(target, value)) {
        const numeric = target.members.filter(
          (member): member is Extract<Shape, { kind: 'number' }> => member.kind === 'number',
        );

        if (numeric.length)
          this.check(number(numeric.flatMap((member) => member.ranges)), value, node);
        else if (this.diagnostics.unknownValues === 'error')
          this.diagnostics.emit(node, 'unknownRange', {});
      }

      return;
    }
    if (target.kind === 'number') {
      if (value.kind !== 'number') {
        if (this.diagnostics.unknownValues === 'error')
          this.diagnostics.emit(node, 'unknownRange', {});

        return;
      }
      if (this.acceptable(target, value)) return;

      const singleton =
        value.ranges.length === 1 && value.ranges[0]?.[0] === value.ranges[0]?.[1] && !value.nan;
      const coverage = this.coverage(target.ranges);
      const entirelyOutside = value.ranges.every((range) => !intersectingRange(coverage, range));
      let display = 'NaN';

      if (singleton) display = String(value.ranges[0]?.[0]);
      else if (value.ranges.length) display = formatRanges(value.ranges);

      this.diagnostics.emit(node, entirelyOutside ? 'outOfRange' : 'possibleOutOfRange', {
        value: display,
        range: formatRanges(target.ranges),
      });

      return;
    }
    if (target.kind === 'array') {
      if (value.kind !== 'array') {
        if (this.diagnostics.unknownValues === 'error')
          this.diagnostics.emit(node, 'unknownRange', {});

        return;
      }
      if (value.items)
        value.items.forEach((item, index) =>
          this.check(
            target.items?.[index] ?? target.element,
            item,
            ts.isArrayLiteralExpression(node) ? (node.elements[index] ?? node) : node,
          ),
        );
      else this.check(target.element, value.element, node);

      return;
    }
    if (target.kind === 'object') {
      if (value.kind !== 'object') {
        if (this.diagnostics.unknownValues === 'error')
          this.diagnostics.emit(node, 'unknownRange', {});

        return;
      }

      const properties = ts.isObjectLiteralExpression(node) ? this.properties(node) : undefined;

      for (const [name, property] of target.properties) {
        const child = properties?.get(name);
        const location = child && ts.isPropertyAssignment(child) ? child.initializer : node;

        this.check(
          property,
          value.properties.get(name) ?? { kind: 'other', tag: 'undefined' },
          location,
        );
      }
      if (target.index)
        for (const [name, property] of value.properties) {
          if (!target.properties.has(name)) this.check(target.index, property, node);
        }
    }
  }

  private constrained(shape: Shape, seen = new Set<ts.Node>()): boolean {
    switch (shape.kind) {
      case 'number':
      case 'invalid':
        return true;
      case 'function': {
        if (seen.has(shape.declaration)) return false;

        seen.add(shape.declaration);

        return [
          shape.declaration.type,
          ...shape.declaration.parameters.map((parameter) => parameter.type),
        ].some((type) => this.constrained(this.types.read(type, shape.env), seen));
      }
      case 'object':
        return [...shape.properties.values(), ...(shape.index ? [shape.index] : [])].some((value) =>
          this.constrained(value, seen),
        );
      case 'array':
        return this.constrained(shape.element, seen);
      case 'union':
        return shape.members.some((value) => this.constrained(value, seen));
      default:
        return false;
    }
  }

  private acceptable(target: Shape, value: Shape): boolean {
    if (target.kind === 'other') return value.kind === 'other' && value.tag === target.tag;
    if (!this.constrained(target)) return true;
    if (target.kind === 'number' && value.kind === 'number')
      return !value.nan && this.covers(target.ranges, value.ranges);
    if (target.kind === 'union')
      return target.members.some(
        (member) => member.kind !== 'unknown' && this.acceptable(member, value),
      );

    return false;
  }

  private covers(target: Range[], source: Range[]): boolean {
    const ranges = this.coverage(target);

    for (const range of source) {
      const intersection = intersectingRange(ranges, range);

      if (!intersection || intersection[0] > range[0] || intersection[1] < range[1]) return false;
    }

    return true;
  }

  private coverage(target: Range[]): Range[] {
    let ranges = this.mergedRanges.get(target);

    if (!ranges) {
      ranges = mergeRanges(target);
      this.mergedRanges.set(target, ranges);
    }

    return ranges;
  }

  private properties(node: ts.ObjectLiteralExpression): Map<string, ts.ObjectLiteralElementLike> {
    let properties = this.objectProperties.get(node);

    if (!properties) {
      properties = new Map();

      for (const property of node.properties) {
        if (!property.name) continue;

        const name = propertyName(property.name);

        if (!properties.has(name)) properties.set(name, property);
      }

      this.objectProperties.set(node, properties);
    }

    return properties;
  }
}
