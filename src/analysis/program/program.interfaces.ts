import type ts from 'typescript';

export interface AnalysisProgram {
  readonly source: ts.SourceFile;
  readonly checker: ts.TypeChecker;
}
