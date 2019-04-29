import * as ts from 'typescript/lib/tsserverlibrary';

import {
  getCurrentLanguageService,
  getCurrentProgram,
  getCurrentSourceFile,
  setCurrentBetweenNodeList,
  setCurrentProgram,
  setCurrentSourceFile,
} from '../project';
import { createBetweenDiagnostics } from '../reports/diagnostic-list';
import { nodeWalker, walkNodeList } from './walkers';

export function createBetweenLanguageService(info: ts.server.PluginCreateInfo) {
  const nextLanguageService = createNextLanguageService(info);

  nextLanguageService.getSemanticDiagnostics = createNextSemanticDiagnostics;

  return nextLanguageService;
}

export function createNextLanguageService(info: ts.server.PluginCreateInfo) {
  return { ...info.languageService };
}

export function createNextSemanticDiagnostics(fileName: string) {
  const previous = getSemanticDiagnostics(fileName) || [];

  setCurrentBetweenNodeList({});
  setCurrentProgram(getCurrentLanguageService().getProgram());

  const program = getCurrentProgram();

  if (program) {
    setCurrentSourceFile(program.getSourceFile(fileName));

    const sourceFile = getCurrentSourceFile();

    if (sourceFile) {
      walkNodeList(sourceFile, node => nodeWalker(node));
    }
  }

  return [ ...previous, ...createBetweenDiagnostics() ];
}

export function getLanguageService(info: ts.server.PluginCreateInfo) {
  return info.languageService;
}

export function getSemanticDiagnostics(fileName: string) {
  return getCurrentLanguageService().getSemanticDiagnostics(fileName);
}
