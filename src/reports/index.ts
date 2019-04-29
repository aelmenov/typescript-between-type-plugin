import * as ts from 'typescript/lib/tsserverlibrary';

import { Report } from './types';

export function createReport(span: ts.TextSpan, message: string, category: ts.DiagnosticCategory): Report {
  return { span, category, message };
}
