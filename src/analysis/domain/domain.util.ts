import type { Range } from '../../ranges/range.types.js';
import type { Shape } from './domain.types.js';

export const unknown: Shape = { kind: 'unknown' };

export const unrestricted: Shape = { kind: 'any' };

export const invalid: Shape = { kind: 'invalid' };

export function number(ranges: Range[], nan = false): Shape {
  return { kind: 'number', ranges, nan };
}

export function literal(value: number): Shape {
  return number(Number.isNaN(value) ? [] : [[value, value]], Number.isNaN(value));
}

export function join(a: Shape, b: Shape): Shape {
  if (a.kind === 'number' && b.kind === 'number') {
    if (a.ranges.length + b.ranges.length <= 32)
      return number([...a.ranges, ...b.ranges], a.nan || b.nan);

    let min = Infinity;
    let max = -Infinity;

    for (const ranges of [a.ranges, b.ranges])
      for (const [start, end] of ranges) {
        min = Math.min(min, start);
        max = Math.max(max, end);
      }

    return number([[min, max]], a.nan || b.nan);
  }
  if (a.kind === 'other' && b.kind === 'other' && a.tag === b.tag) return a;
  if (a.kind === 'object' && b.kind === 'object') {
    const properties = new Map<string, Shape>();

    for (const [key, value] of a.properties)
      properties.set(key, join(value, b.properties.get(key) ?? unknown));

    return { kind: 'object', properties };
  }
  if (a.kind === 'array' && b.kind === 'array')
    return { kind: 'array', element: join(a.element, b.element) };

  return unknown;
}

export function arithmetic(operator: string, left: Shape, right: Shape): Shape {
  if (left.kind !== 'number' || right.kind !== 'number') return unknown;

  let nan = left.nan || right.nan;
  const result: Range[] = [];

  for (const [a, b] of left.ranges)
    for (const [c, d] of right.ranges) {
      const evaluate = (x: number, y: number) => {
        switch (operator) {
          case '+':
            return x + y;
          case '-':
            return x - y;
          case '*':
            return x * y;
          case '/':
            return x / y;
          case '%':
            return x % y;
          case '**':
            return x ** y;
          case '&':
            return x & y;
          case '|':
            return x | y;
          case '^':
            return x ^ y;
          case '<<':
            return x << y;
          case '>>':
            return x >> y;
          case '>>>':
            return x >>> y;
          default:
            return NaN;
        }
      };

      if (a === b && c === d) {
        const value = evaluate(a, c);

        if (Number.isNaN(value)) nan = true;
        else result.push([value, value]);

        continue;
      }
      if (['&', '|', '^', '<<', '>>', '>>>'].includes(operator)) {
        result.push(operator === '>>>' ? [0, 4294967295] : [-2147483648, 2147483647]);
        continue;
      }
      if (operator === '/' && c <= 0 && d >= 0) return unknown;
      if (operator === '%') {
        if (c <= 0 && d >= 0) return unknown;

        const bound = Math.max(Math.abs(c), Math.abs(d));

        result.push([a < 0 ? -bound : 0, b > 0 ? bound : 0]);
        continue;
      }
      if (operator === '**' && (c !== d || !Number.isInteger(c))) return unknown;
      if (operator === '**' && c < 0 && a <= 0 && b >= 0) return unknown;
      if (!['+', '-', '*', '/', '**'].includes(operator)) return unknown;

      const points = [evaluate(a, c), evaluate(a, d), evaluate(b, c), evaluate(b, d)];

      if (operator === '**' && a <= 0 && b >= 0) points.push(evaluate(0, c));
      if (
        operator === '*' &&
        ((a <= 0 && b >= 0 && (!Number.isFinite(c) || !Number.isFinite(d))) ||
          (c <= 0 && d >= 0 && (!Number.isFinite(a) || !Number.isFinite(b))))
      )
        nan = true;
      if (points.some(Number.isNaN)) nan = true;

      const finite = points.filter((value) => !Number.isNaN(value));

      if (finite.length) result.push([Math.min(...finite), Math.max(...finite)]);
    }

  return number(result, nan);
}
