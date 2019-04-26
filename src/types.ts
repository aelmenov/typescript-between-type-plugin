import * as ts from 'typescript/lib/tsserverlibrary';

export type TypeScriptModule = {
  typescript: typeof ts;
};

export type Visitor = (node: ts.Node) => void;

export type Range = [ number, number ];

export type Project = {
  program?: ts.Program;
  sourceFile?: ts.SourceFile;
  languageService: ts.LanguageService;
  rangeNodes: BetweenNodeList;
};

export type BetweenNode<T> = {
  name: string;
  value: T;
  source: ts.SourceFile;
  span: ts.TextSpan;
  ranges: Range[];
  reports: ReportList;
};

export type BetweenNodeList = {
  [hashCode: number]: BetweenNode<any>;
};

export type Report = {
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
