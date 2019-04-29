import { ReportList } from '../reports/types';
import { BetweenNodeTypeKind } from './enums';

export type Range = [ number, number ];

export type BetweenNode<T> = {
  type: BetweenNodeTypeKind;
  name: string;
  value: T;
  source: ts.SourceFile;
  ranges: Range[];
  reportList: ReportList;
};

export type BetweenNodeList = {
  [hashCode: number]: BetweenNode<any>;
};
