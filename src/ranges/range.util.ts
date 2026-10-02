import type { Range } from './range.types.js';

export function contains(ranges: readonly Range[], value: number): boolean {
  return ranges.some(([min, max]) => min <= value && value <= max);
}

export function formatRanges(ranges: readonly Range[]): string {
  return ranges.map(([min, max]) => `Between<${min}, ${max}>`).join(' | ');
}

export function mergeRanges(ranges: readonly Range[]): Range[] {
  const merged: Range[] = [];

  for (const range of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = merged[merged.length - 1];

    if (last && range[0] <= last[1])
      merged[merged.length - 1] = [last[0], Math.max(last[1], range[1])];
    else merged.push(range);
  }

  return merged;
}

export function intersectingRange(ranges: readonly Range[], source: Range): Range | undefined {
  let low = 0;
  let high = ranges.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const range = ranges[middle];

    if (!range) return undefined;
    if (range[0] > source[1]) high = middle - 1;
    else if (range[1] < source[0]) low = middle + 1;
    else return range;
  }

  return undefined;
}
