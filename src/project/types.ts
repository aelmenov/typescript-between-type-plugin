import { BetweenNodeList } from '../between/types';

export type Project = {
  program?: ts.Program;
  sourceFile?: ts.SourceFile;
  languageService: ts.LanguageService;
  betweenNodeList: BetweenNodeList;
};
