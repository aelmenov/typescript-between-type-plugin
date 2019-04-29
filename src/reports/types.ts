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
