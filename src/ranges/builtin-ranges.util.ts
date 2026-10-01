import { builtinBounds } from './builtin-ranges.constants.js';
import type { Range } from './range.types.js';

export function getBuiltinRange(name: string): Range | undefined {
  const entry = Object.entries(builtinBounds).find(([alias]) => alias === name);
  if (!entry) return undefined;
  const [, [min, max]] = entry;
  return [Number(min), Number(max)];
}
