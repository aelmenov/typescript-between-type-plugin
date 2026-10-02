import { builtinBounds } from './builtin-ranges.constants.js';
import type { Range } from './range.types.js';

const builtinRanges = new Map<string, Range>(
  Object.entries(builtinBounds).map(([name, [min, max]]) => [name, [Number(min), Number(max)]]),
);

export function getBuiltinRange(name: string): Range | undefined {
  return builtinRanges.get(name);
}
