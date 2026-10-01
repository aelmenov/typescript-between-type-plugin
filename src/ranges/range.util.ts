import type { Range } from './range.types.js';

export function contains(ranges: readonly Range[], value: number): boolean {
  return ranges.some(([min, max]) => min <= value && value <= max);
}

export function formatRanges(ranges: readonly Range[]): string {
  return ranges.map(([min, max]) => `Between<${min}, ${max}>`).join(' | ');
}
