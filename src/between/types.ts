import { ReportList } from '../reports/types';

export type Range = [ number, number ];

export type BetweenNode<T> = {
  name: string;
  value: T;
  source: ts.SourceFile;
  span: ts.TextSpan;
  ranges: Range[];
  reportList: ReportList;
};

export type BetweenNodeList = {
  [hashCode: number]: BetweenNode<any>;
};
