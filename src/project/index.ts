import * as ts from 'typescript/lib/tsserverlibrary';

import { BetweenNode, BetweenNodeList } from '../between/types';
import { Project } from './types';

let project: Project;

export function getProject() {
  return project;
}

export function getProgram() {
  return project.program;
}

export function getCurrentSourceFile() {
  return project.sourceFile;
}

export function getCurrentLanguageService() {
  return project.languageService;
}

export function getBetweenNodeList() {
  return project.betweenNodeList;
}

export function getBetweenNode<T>(id: number): BetweenNode<T> {
  return project.betweenNodeList[id];
}

export function setProject(newProject: Project) {
  project = newProject;
}

export function setProgram(program?: ts.Program) {
  project.program = program;
}

export function setCurrentSourceFile(sourceFile?: ts.SourceFile) {
  project.sourceFile = sourceFile;
}

export function setCurrentLanguageService(languageService: ts.LanguageService) {
  project.languageService = languageService;
}

export function setBetweenNodeList(betweenNodeList: BetweenNodeList) {
  project.betweenNodeList = betweenNodeList;
}

export function setBetweenNode<T>(id: number, node: BetweenNode<T>) {
  project.betweenNodeList[id] = node;
}
