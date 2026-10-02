import { literal, number, unknown } from './domain.util.js';
import type { Shape } from './domain.types.js';

export function readMember(shape: Shape, key: string | undefined): Shape {
  if (shape.kind === 'object')
    return (key === undefined ? undefined : shape.properties.get(key)) ?? shape.index ?? unknown;
  if (shape.kind === 'array') {
    if (key === 'length')
      return shape.items ? literal(shape.items.length) : number([[0, 4294967295]]);
    if (key !== undefined && !/^\d+$/.test(key)) return unknown;

    return (key === undefined ? undefined : shape.items?.[Number(key)]) ?? shape.element;
  }

  return unknown;
}
