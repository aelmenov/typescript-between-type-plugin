import * as ts from 'typescript/lib/tsserverlibrary';

import { createReport } from '.';
import { BetweenNode, Range } from '../between/types';
import { ASSIGNABLE_GREATER_THAN_RANGE_CODE, ASSIGNABLE_LESS_THAN_RANGE_CODE } from './config';
import { reportMessageList } from './report-message-list';
import { ReportList } from './types';

export function createReportListForAssignments<T>(node: BetweenNode<T>, span: ts.TextSpan): ReportList {
  let result: ReportList = {};

  if (node.ranges.length > 0) {
    const { ranges } = node;

    ranges.forEach(range => {
      result = createReportIfAssignmentsIsOutOfRange<any>(node, span, range);
    });
  }

  return result;
}

export function createReportIfAssignmentsIsOutOfRange<T extends number>(node: BetweenNode<T>, span: ts.TextSpan, range: Range) {
  let result: ReportList = {};

  const [ min, max ] = range;

  if (node.value) {
    if (min > node.value) {
      createOutOfRangeNoteInReportList(ASSIGNABLE_LESS_THAN_RANGE_CODE, result, node.value, span, min, node.ranges);
    } else if (node.value > max) {
      createOutOfRangeNoteInReportList(ASSIGNABLE_GREATER_THAN_RANGE_CODE, result, node.value, span, max, node.ranges);
    }
  }

  return result;
}

export function createOutOfRangeNoteInReportList<T extends number>(code: number, reportList: ReportList, value: number, span: ts.TextSpan, availableValue: number, ranges: Range[]) {
  reportList[code] = createOutOfRangeReport(code, span, value, availableValue, ranges);
}

export function createOutOfRangeReport<T extends number>(code: number, span: ts.TextSpan, value: number, availableValue: number, ranges: Range[]) {
  return createReport(
    span,
    reportMessageList.errors[code](value)(availableValue)(ranges),
    ts.DiagnosticCategory.Error
  );
}
