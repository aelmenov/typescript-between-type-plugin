import { isBetweenType } from '../verificators';
import { BETWEEN_VALUE_REGEX } from './config';
import { Range, RangeList } from './types';

export function createRangeListFromTypeString(type: string) {
  const result: RangeList = [];

  type.split('|').map(x => x.trim()).forEach(type => {
    if (isBetweenType(type)) {
      const parsedRange = type.match(BETWEEN_VALUE_REGEX);

      if (parsedRange && parsedRange.length === 2) {
        let [ start, end ] = parsedRange.map(x => +x);

        if (end < start) {
            [ start, end ] = [ end, start ];
        }

        result.push([ start, end ]);
      }

    }
  });

  return result;
}

export function calculateSummaryRange(rangeList: RangeList) {
  let globalRange: Range | undefined;

  if (rangeList.length > 0) {
    globalRange = rangeList[0];

    rangeList.forEach(([ min, max ]) => {
      const [ gMin, gMax ] = globalRange as Range;

      globalRange = [
        Math.min( min, gMin ),
        Math.max( max, gMax )
      ];
    });
  }

  return globalRange;
}
