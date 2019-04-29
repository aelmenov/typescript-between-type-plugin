import * as ts from 'typescript/lib/tsserverlibrary';

import {
  getCurrentLanguageService,
  getCurrentSourceFile,
  getProgram,
  setBetweenNodeList,
  setCurrentSourceFile,
  setProgram,
} from '../project';
import { createBetweenDiagnosticList } from '../reports/diagnostic-list';
import { nodeWalker, walkNodeList } from './walkers';

export function createBetweenLanguageService(info: ts.server.PluginCreateInfo) {
  const nextLanguageService = createNextLanguageService(info);

  nextLanguageService.getSemanticDiagnostics = createNextSemanticDiagnostics;

  return nextLanguageService;
}

export function createNextLanguageService(info: ts.server.PluginCreateInfo) {
  return { ...info.languageService };
}

// TODO: To delete
export let test: ts.Diagnostic[] = [];

export function createNextSemanticDiagnostics(fileName: string) {
  const previous = getSemanticDiagnostics(fileName) || [];

  setBetweenNodeList({});
  setProgram(getCurrentLanguageService().getProgram());

  const program = getProgram();

  if (program) {
    setCurrentSourceFile(program.getSourceFile(fileName));

    const sourceFile = getCurrentSourceFile();

    if (sourceFile) {
      walkNodeList(sourceFile, node => nodeWalker(node));
    }
  }

  // TODO: delete ...test
  return [ ...previous, ...createBetweenDiagnosticList(), ...test ];
}

export function getLanguageService(info: ts.server.PluginCreateInfo) {
  return info.languageService;
}

export function getSemanticDiagnostics(fileName: string) {
  return getCurrentLanguageService().getSemanticDiagnostics(fileName);
}
