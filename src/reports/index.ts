import { BetweenNode } from '../between/types';
import { testIsValueOutOfRange } from './tests';
import { Report, ReportList } from './types';

export function createReport(message: string, category: ts.DiagnosticCategory): Report {
  return { category, message };
}

export function createReportList<T>(node: BetweenNode<T>): ReportList {
  let result: ReportList = {};

  if (node.ranges.length > 0) {
    const { ranges } = node;

    ranges.forEach(range => {
      result = {
        ...testIsValueOutOfRange<any>(node, range)
      };
    });
  }

  return result;
}
