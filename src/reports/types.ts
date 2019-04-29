import * as ts from 'typescript/lib/tsserverlibrary';

export type Report = {
  span: ts.TextSpan;
  category: ts.DiagnosticCategory;
  message: string;
};

export type ReportList = {
  [code: number]: Report;
};

export type ReportMessageList = {
  [category: string]: {
    [code: number]: any;
  };
};
