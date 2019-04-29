import * as ts from 'typescript/lib/tsserverlibrary';

import { getCurrentSourceFile } from '../project';
import { getHash } from '../utils';
import { isBetweenType } from '../verificators';
import { BETWEEN_VALUE_REGEX } from './config';
import { BetweenNode, Range } from './types';

export function createBetweenNode<T>(name: string, value: T, span: ts.TextSpan, ranges: Range[] = []): BetweenNode<T> {
  return {
    name, value,
    source: getCurrentSourceFile() as ts.SourceFile,
    span, ranges, reportList: {}
  };
}

export function createBetweenId(name: string, start: number, end: number) {
  let id = -1;

  const source = getCurrentSourceFile();

  if (source) {
    id = getHash(`${source.fileName}:${name}:${start}:${end}`);
  }

  return id;
}

export function createRangeFromTypeString(type: string): Range[] {
  let min = 0;
  let max = 0;

  type.split('|').map(x => x.trim()).forEach(type => {
    if (isBetweenType(type)) {
      const parsedRange = type.match(BETWEEN_VALUE_REGEX);

      if (parsedRange && parsedRange.length === 2) {
        let [ start, end ] = parsedRange.map(x => +x);

        if (end < start) {
            [ start, end ] = [ end, start ];
        }

        if (start < min) min = start;
        if (end > max) max = end;
      }
    }
  });

  return [[ min, max ]];
}
