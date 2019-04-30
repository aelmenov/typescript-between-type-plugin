import * as ts from 'typescript/lib/tsserverlibrary';

import { createReport } from '.';
import { BetweenNode, Range, RangeList } from '../between/types';
import { calculateSummaryRange } from '../between/utils';
import { ASSIGNABLE_GREATER_THAN_RANGE_CODE, ASSIGNABLE_LESS_THAN_RANGE_CODE } from './config';
import { reportMessageList } from './report-message-list';
import { ReportList, ReportNode } from './types';

export function createReportListForAssignments<T>(node: BetweenNode<T>, span: ts.TextSpan) {
  let reportList: ReportList = [];

  const { rangeList } = node;

  if (rangeList.length === 1) {
    addOutOfRangeReportIntoList<any>(node, span, rangeList[0], reportList);
  } else if (rangeList.length > 1) {
    let summaryRange = calculateSummaryRange(rangeList);

    if (summaryRange) {
      const globalReport = createReportIfAssignmentsIsOutOfRange<any>(node, span, summaryRange);

      if (globalReport) {
        reportList.push(globalReport);
      } else {
        let tempList: ReportList = [];

        rangeList.forEach(range => addOutOfRangeReportIntoList<any>(node, span, range, tempList));

        if (tempList.length === rangeList.length) {
          tempList.forEach(reportNode => {
            const [ code ] = reportNode;

            if (!reportList.some(([ x ]) => x === code)) {
              reportList.push(reportNode);
            }
          });
        }
      }
    }
  }

  return reportList;
}

export function createReportIfAssignmentsIsOutOfRange<T extends number>(node: BetweenNode<T>, span: ts.TextSpan, range: Range) {
  let report: ReportNode | undefined;

  const [ min, max ] = range;

  if (node.value) {
    if (min > node.value) {
      report = [
        ASSIGNABLE_LESS_THAN_RANGE_CODE,
        createOutOfRangeReport(ASSIGNABLE_LESS_THAN_RANGE_CODE, span, node.value, min, [ range ])
      ];
    } else if (node.value > max) {
      report = [
        ASSIGNABLE_GREATER_THAN_RANGE_CODE,
        createOutOfRangeReport(ASSIGNABLE_GREATER_THAN_RANGE_CODE, span, node.value, max, [ range ])
      ];
    }
  }

  return report;
}

export function createOutOfRangeReport<T extends number>(code: number, span: ts.TextSpan, value: number, availableValue: number, ranges: RangeList) {
  return createReport(
    span,
    reportMessageList.errors[code](value)(availableValue)(ranges),
    ts.DiagnosticCategory.Error
  );
}

function addOutOfRangeReportIntoList<T extends number>(node: BetweenNode<T>, span: ts.TextSpan, range: Range, list: ReportList) {
  const report = createReportIfAssignmentsIsOutOfRange<any>(node, span, range);

  if (report) {
    list.push(report);
  }
}
