import * as ts from 'typescript/lib/tsserverlibrary';

import { createReport } from '.';
import { BetweenNode, Range } from '../between/types';
import { GREATER_THAN_RANGE_CODE, LESS_THAN_RANGE_CODE } from './config';
import { reportMessageList } from './report-message-list';
import { Report, ReportList } from './types';

export function testIsValueOutOfRange<T extends number>(node: BetweenNode<T>, range: Range) {
  let result: ReportList = {};

  const [ min, max ] = range;

  if (node.value) {
    const lessTestReport = testIsValueLessThanMin(node.name, min, node.value as any as number);
    const greaterTestReport = testIsValueGreaterThanMax(node.name, max, node.value as any as number);

    if (lessTestReport) {
      result[LESS_THAN_RANGE_CODE] = lessTestReport;
    } else if (greaterTestReport) {
      result[GREATER_THAN_RANGE_CODE] = greaterTestReport;
    }
  }

  return result;
}

export function testIsValueLessThanMin(name: string, min: number, value: number): Report | void {
  if (min > value) {
    return createReport(
      reportMessageList.errors[LESS_THAN_RANGE_CODE](name)(value)(min),
      ts.DiagnosticCategory.Error
    );
  }
}

export function testIsValueGreaterThanMax(name: string, max: number, value: number): Report | void {
  if (value > max) {
    return createReport(
      reportMessageList.errors[GREATER_THAN_RANGE_CODE](name)(value)(max),
      ts.DiagnosticCategory.Error
    );
  }
}
