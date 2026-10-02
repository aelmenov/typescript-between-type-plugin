import ts from 'typescript';
import type { AnalysisProgram } from './program.interfaces.js';

export function createAnalysisProgram(text: string, filename: string): AnalysisProgram {
  const file = ts.sys.resolvePath(
    filename.endsWith('.ts') || filename.endsWith('.tsx') ? filename : `${filename}.ts`,
  );
  const config = ts.findConfigFile(file.slice(0, file.lastIndexOf('/')), ts.sys.fileExists);
  let options: ts.CompilerOptions = {};

  if (config) {
    const read = ts.readConfigFile(config, ts.sys.readFile);

    // Only options are needed; discovering project files would scan unrelated directories.
    if (!read.error)
      options = ts.parseJsonConfigFileContent(
        read.config,
        { ...ts.sys, readDirectory: () => [] },
        config.slice(0, config.lastIndexOf('/')),
      ).options;
  }

  options = {
    ...options,
    noLib: true,
    types: [],
    noEmit: true,
    skipLibCheck: true,
  };
  const host = ts.createCompilerHost(options, true);
  const getSourceFile = host.getSourceFile.bind(host);
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  host.getSourceFile = (name, languageVersion, onError, fresh) =>
    ts.sys.resolvePath(name) === file
      ? source
      : getSourceFile(name, languageVersion, onError, fresh);
  const program = ts.createProgram([file], options, host);

  return { source, checker: program.getTypeChecker() };
}
