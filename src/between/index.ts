import * as ts from 'typescript/lib/tsserverlibrary';

import { getCurrentSourceFile } from '../project';
import { getHash } from '../utils';
import { BetweenNodeTypeKind } from './enums';
import { BetweenNode, RangeList } from './types';

export function createBetweenNode<T>(type: BetweenNodeTypeKind, name: string, value: T, span: ts.TextSpan, ranges: RangeList = []): BetweenNode<T> {
  return {
    type, name, value,
    source: getCurrentSourceFile() as ts.SourceFile,
    rangeList: ranges,
    reportList: []
  };
}

export function createBetweenNodeHash(name: string, start: number, end: number) {
  let id = -1;

  const source = getCurrentSourceFile();

  if (source) {
    id = getHash(`${source.fileName}:${name}:${start}:${end}`);
  }

  return id;
}
