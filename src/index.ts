import * as ts from 'typescript/lib/tsserverlibrary';

import {
  BETWEEN_TYPE_IN_STRING_REGEX,
  BETWEEN_TYPE_REGEX,
  BETWEEN_VALUE_REGEX,
  GREATER_THAN_RANGE_CODE,
  INVALID_TYPESCRIPT_VERSION,
  LESS_THAN_RANGE_CODE,
  PLUGIN_NAME,
} from './constants';
import { reports } from './messages';
import { BetweenNode, Project, Range, Report, ReportList, TypeScriptModule, Visitor } from './types';
import { getHash, log } from './utils';

let project: Project;

function createBetweenPlugin(info: ts.server.PluginCreateInfo, module: TypeScriptModule) {
  if (isValidTypeScriptVersion(module.typescript)) {
    log(info, reports.log[INVALID_TYPESCRIPT_VERSION]);
  }

  project = {
    languageService: getCurrentLanguageService(info),
    rangeNodes: { }
  };

  return createBetweenLanguageService(info);
}

function createBetweenLanguageService(info: ts.server.PluginCreateInfo) {
  const nextLanguageService = createNextLanguageService(info);

  nextLanguageService.getSemanticDiagnostics = createNextSemanticDiagnostics;

  return nextLanguageService;
}

function createNextLanguageService(info: ts.server.PluginCreateInfo) {
  return { ...info.languageService };
}

function getCurrentLanguageService(info: ts.server.PluginCreateInfo) {
  return info.languageService;
}

function createNextSemanticDiagnostics(fileName: string) {
  const previous = getCurrentSemanticDiagnostics(fileName) || [];

  project.rangeNodes = { };

  project.program = project.languageService.getProgram();

  if (project.program) {
    project.sourceFile = project.program.getSourceFile(fileName);

    if (project.sourceFile) {
      visitAllNodes(project.sourceFile, node => nodeVisitor(node));
    }
  }

  return [ ...previous, ...createRangeDiagnostics() ];
}

function getCurrentSemanticDiagnostics(fileName: string) {
  return project.languageService.getSemanticDiagnostics(fileName);
}

function visitAllNodes(node: ts.Node, visitor: Visitor) {
  visitor(node);

  node.forEachChild(child => visitAllNodes(child, visitor));
}

function nodeVisitor(node: ts.Node) {
  if (isVariableStatement(node)) {
    variableStatementVisitor(node);
  } else if (isVariableDeclaration(node)) {
    variableDeclarationVisitor(node);
  }
}

function variableStatementVisitor(node: ts.VariableStatement) {
  node.declarationList.forEachChild(node => {
    if (isVariableDeclaration(node)) {
      variableDeclarationVisitor(node);
    }
  });
}

function variableDeclarationVisitor(node: ts.VariableDeclaration) {
  const typeNode = node.type;

  if (typeNode) {
    const types = typeNode.getText();
    const initializer = node.initializer;

    if (types && hasBetweenType(types) && initializer) {
      const value = +initializer.getText();
      const name = node.name.getText();
      const nameSpan = createSpan(node.name.getStart(), node.name.getEnd());
      const id = createRangeId(name, nameSpan.start, nameSpan.length);
      const ranges = createRangeFromTypeString(types);
      const rangeNode = createRangeNode(name, value, nameSpan, node, ranges);

      rangeNode.reports = createReportList(rangeNode);

      project.rangeNodes[id] = rangeNode;
    }
  }
}

function isBetweenType(str: string) {
  return BETWEEN_TYPE_REGEX.test(str);
}

function hasBetweenType(str: string) {
  return BETWEEN_TYPE_IN_STRING_REGEX.test(str);
}

function isValidTypeScriptVersion(typescript: typeof ts) {
  const [ major ] = typescript.version.split('.');

  return +major >= 3;
}

function isVariableDeclaration(node: ts.Node): node is ts.VariableDeclaration {
  return node.kind === ts.SyntaxKind.VariableDeclaration;
}

function isVariableStatement(node: ts.Node): node is ts.VariableStatement {
  return node.kind === ts.SyntaxKind.VariableStatement;
}

function createRangeFromTypeString(type: string): Range[] {
  let min = 0;
  let max = 0;

  type.split('|').map(x => x.trim()).forEach(type => {
    if (isBetweenType(type)) {
      const parsedRange = type.match(BETWEEN_VALUE_REGEX);

      if (parsedRange && parsedRange.length === 2) {
        let [ start, end ] = parsedRange.map(x => +x);

        if (end < start) {
            [ start, end ] = [ end, start ];
        }

        if (start < min) min = start;
        if (end > max) max = end;
      }
    }
  });

  return [[ min, max ]];
}

function createRangeNode<T>(name: string, value: T, span: ts.TextSpan, node: ts.Node, ranges: Range[] = []): BetweenNode<T> {
  return {
    name, value,
    source: project.sourceFile as ts.SourceFile,
    span, ranges, reports: {}
  };
}

function createRangeId(name: string, start: number, end: number): number {
  let id = -1;

  const source = project.sourceFile;

  if (source) {
    id = getHash(`${source.fileName}:${name}:${start}:${end}`);
  }

  return id;
}

function createSpan(start: number, end: number): ts.TextSpan {
  return ts.createTextSpan(start, end - start);
}

function createReportList<T>(node: BetweenNode<T>): ReportList {
  let result: ReportList = {};

  if (node.ranges.length > 0) {
    const { ranges, value } = node;

    ranges.forEach(range => {
      result = {
        ...testIsValueOutOfRange<any>(node, range)
      };
    });
  }

  return result;
}

function testIsValueLessThanMin(name: string, min: number, value: number): Report | void {
  if (min > value) {
    return createReport(
      reports.errors[LESS_THAN_RANGE_CODE](name)(value)(min),
      ts.DiagnosticCategory.Error
    );
  }
}

function testIsValueGreaterThanMax(name: string, max: number, value: number): Report | void {
  if (value > max) {
    return createReport(
      reports.errors[GREATER_THAN_RANGE_CODE](name)(value)(max),
      ts.DiagnosticCategory.Error
    );
  }
}

function testIsValueOutOfRange<T extends number>(node: BetweenNode<T>, range: Range): ReportList {
  let result: ReportList = {};

  const [ min, max ] = range;

  if (node.value) {
    const lessTestReport = testIsValueLessThanMin(node.name, min, node.value as any as number);
    const greaterTestReport = testIsValueGreaterThanMax(node.name, max, node.value as any as number);

    if (lessTestReport) {
      result[LESS_THAN_RANGE_CODE] = lessTestReport;
    }

    if (greaterTestReport) {
      result[LESS_THAN_RANGE_CODE] = greaterTestReport;
    }
  }

  return result;
}

function createReport(message: string, category: ts.DiagnosticCategory): Report {
  return { category, message };
}

function createRangeDiagnostics(): ts.Diagnostic[] {
  let diagnostic: ts.Diagnostic[] = [];

  const { rangeNodes } = project;

  if (Object.keys(rangeNodes).length > 0) {
    for (let id in rangeNodes) {
      if (rangeNodes.hasOwnProperty(id)) {
        const node: BetweenNode<any> = rangeNodes[id];
        const { reports } = node;

        if (Object.keys(reports).length > 0) {
          for (let code in reports) {
            if (reports.hasOwnProperty(code)) {
              const report: Report = reports[code];
              const { message, category } = report;
              const { source, span } = node;
              const { start, length } = span;

              diagnostic.push({
                category,
                code: Number(code),
                file: source,
                start, length,
                messageText: message,
                source: PLUGIN_NAME
              });
            }
          }
        }
      }
    }
  }

  return diagnostic;
}

module.exports = function(module: TypeScriptModule) {
  return {
    create: (info: ts.server.PluginCreateInfo) => createBetweenPlugin(info, module)
  };
};

// function isExpressionStatement(node: ts.Node): node is ts.ExpressionStatement {
//   return node.kind === ts.SyntaxKind.ExpressionStatement;
// }

// function isBinaryExpression(node: ts.Node): node is ts.BinaryExpression {
//   return node.kind === ts.SyntaxKind.BinaryExpression;
// }

// else if (isExpressionStatement(node)) {
//   expressionStatementVisitor(sourceFile, node, reportList);
// }
// function expressionStatementVisitor(
//   sourceFile: ts.SourceFile,
//   node: ts.ExpressionStatement,
//   reportList: ts.Diagnostic[]
// ) {
//   const definitions = currentLanguageService.getDefinitionAtPosition(sourceFile.fileName, node.getStart());

//   if (program && definitions) {
//     const [ firstDefinition ] = definitions;

//     const source = program.getSourceFile(firstDefinition.fileName);

//     if (source) {
//       visitAllNodes(source, n => {
//         if (isVariableDeclaration(n)) {
//           const span = getProblemSpan(n);

//           if (span.start === firstDefinition.textSpan.start) {
//             const typeNode = n.type;

//             if (typeNode) {
//               reportList.push(
//                 {
//                   file: sourceFile,
//                   start: node.getStart(),
//                   length: node.getStart() - node.getEnd(),
//                   code: 0,
//                   messageText: (node.expression).getText(),
//                   category: ts.DiagnosticCategory.Error,
//                   source: PLUGIN_NAME
//                 }
//               );
//             }
//           }
//         }
//       });
//     }
//   }
// }
