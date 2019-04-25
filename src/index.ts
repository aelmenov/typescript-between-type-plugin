import * as ts from 'typescript/lib/tsserverlibrary';

type TypeScriptModule = {
  typescript: typeof ts;
};

type Range = [ number, number ];

type Reports = {
  [category: string]: {
    [code: number]: any;
  };
};

type Visitor = (node: ts.Node) => void;

const PLUGIN_NAME = 'typescript-between-type-plugin';

const INVALID_TYPESCRIPT_VERSION = 0xf000;
const LESS_THAN_RANGE_CODE = 0xf101;
const GREATER_THAN_RANGE_CODE = 0xf102;

const BETWEEN_TYPE_IN_STRING_REGEX = /between\<[\-]?([\d]+|Infinity){1}\,[\s]*[\-]?([\d]+|Infinity){1}\>/g;
const BETWEEN_TYPE_REGEX = /^between\<[\-]?([\d]+|Infinity){1}\,[\s]*[\-]?([\d]+|Infinity){1}\>$/;
const BETWEEN_VALUE_REGEX = /[\-]?([\d]+|Infinity){1}/g;

const reports: Reports = {
  log: {
    [INVALID_TYPESCRIPT_VERSION]: `Invalid TypeScript version detected. TypeScript 3.x required.`,
  },

  errors: {
    [LESS_THAN_RANGE_CODE]: (name: TemplateStringsArray | string) =>
      (value: TemplateStringsArray | string) =>
        (minValue: TemplateStringsArray | string) =>
          `Value of the "${name}" variable is less than minimal value of the specified range.\nYou specifiy "${value}" but minimal value is "${minValue}".`,

    [GREATER_THAN_RANGE_CODE]: (name: TemplateStringsArray | string) =>
      (value: TemplateStringsArray | string) =>
        (maxValue: TemplateStringsArray | string) =>
          `Value of the "${name}" variable is greater than maximal value of the specified range.\nYou specified "${value}" but maximal value is "${maxValue}".`,
  }
};

function createBetweenPlugin(
  info: ts.server.PluginCreateInfo,
  module: TypeScriptModule
) {
  if (isValidTypeScriptVersion(module.typescript)) {
    log(info, reports.log[INVALID_TYPESCRIPT_VERSION]);
  }

  return createBetweenLanguageService(info);
}

function createBetweenLanguageService(info: ts.server.PluginCreateInfo) {
  const currentLanguageService = getCurrentLanguageService(info);
  const nextLanguageService = getNextLanguageService(info);

  nextLanguageService.getSemanticDiagnostics = (fileName: string) =>
    getNextSemanticDiagnostics(fileName, currentLanguageService);

  return nextLanguageService;
}

function getCurrentLanguageService(info: ts.server.PluginCreateInfo) {
  return info.languageService;
}

function getNextLanguageService(info: ts.server.PluginCreateInfo) {
  return { ...info.languageService };
}

function getCurrentSemanticDiagnostics(
  fileName: string,
  languageService: ts.LanguageService
) {
  return languageService.getSemanticDiagnostics(fileName);
}

function getNextSemanticDiagnostics(
  fileName: string,
  currentLanguageService: ts.LanguageService
) {
  const program = currentLanguageService.getProgram();
  const previous = getCurrentSemanticDiagnostics(fileName, currentLanguageService) || [];
  const reportList: ts.Diagnostic[] = [];

  if (program) {
    const sourceFile = program.getSourceFile(fileName);

    if (sourceFile) {
      visitAllNodes(sourceFile, node => nodeVisitor(sourceFile, node, reportList));
    }
  }

  return [ ...previous, ...reportList ];
}

function visitAllNodes(
  node: ts.Node,
  visitor: Visitor
) {
  visitor(node);

  node.forEachChild(child => visitAllNodes(child, visitor));
}

function nodeVisitor(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  reportList: ts.Diagnostic[]
) {
  if (isVariableDeclaration(node)) {
    variableDeclarationVisitor(sourceFile, node, reportList);
  } else if (isExpressionStatement(node)) {
    expressionStatementVisitor(sourceFile, node, reportList);
  }
}

function variableDeclarationVisitor(
  sourceFile: ts.SourceFile,
  node: ts.VariableDeclaration,
  reportList: ts.Diagnostic[]
) {
  const typeNode = node.type;

  if (typeNode) {
    const types = typeNode.getText();
    const initializer = node.initializer;

    if (types && hasBetweenType(types) && initializer) {
      const value = +initializer.getText();

      compareValueWithRangeAndThrow(
        getRange(types),
        value, sourceFile,
        node, reportList
      );
    }
  }
}

function expressionStatementVisitor(
  sourceFile: ts.SourceFile,
  node: ts.ExpressionStatement,
  reportList: ts.Diagnostic[]
) {
  const expression = node.expression;

  if (isBinaryExpression(expression)) {
    const operator = expression.operatorToken;

    if (isFirstAssignment(expression.operatorToken.kind)) {
      /// node.left --- name is link
    }
  }
}

function compareValueWithRangeAndThrow(
  range: Range,
  value: number,
  sourceFile: ts.SourceFile,
  node: ts.VariableDeclaration,
  reportList: ts.Diagnostic[]
) {
  if (typeof value === 'number') {
    const [ min, max ] = range;
    const name = node.name.getText();
    const span = getProblemSpan(node);

    if (min > value) {
      reportList.push(
        reportError(
          LESS_THAN_RANGE_CODE,
          reports.errors[LESS_THAN_RANGE_CODE](name)(value)(min),
          span, sourceFile
        )
      );
    } else if (value > max) {
      reportList.push(
        reportError(
          GREATER_THAN_RANGE_CODE,
          reports.errors[GREATER_THAN_RANGE_CODE](name)(value)(max),
          span, sourceFile
        )
      );
    }
  }
}

function getProblemSpan(node: ts.VariableDeclaration): ts.TextSpan {
  return ts.createTextSpan(node.name.getStart(), node.name.getEnd() - node.getStart());
}

function getRange(type: string): Range {
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

  return [ min, max ];
}

function reportError(
  code: number,
  messageText: string,
  span: ts.TextSpan,
  file: ts.SourceFile
): ts.Diagnostic {
  const { start, length } = span;

  return {
    file,
    start, length,
    code, messageText,
    category: ts.DiagnosticCategory.Error,
    source: PLUGIN_NAME
  };
}

function log(
  info: ts.server.PluginCreateInfo,
  messageText: string
) {
  info.project.projectService.logger.info(`[${PLUGIN_NAME}] ${messageText}`);
}

function isValidTypeScriptVersion(typescript: typeof ts) {
  const [ major ] = typescript.version.split('.');

  return +major >= 3;
}

function isVariableDeclaration(node: ts.Node): node is ts.VariableDeclaration {
  return node.kind === ts.SyntaxKind.VariableDeclaration;
}

function isExpressionStatement(node: ts.Node): node is ts.ExpressionStatement {
  return node.kind === ts.SyntaxKind.ExpressionStatement;
}

function isBinaryExpression(node: ts.Node): node is ts.BinaryExpression {
  return node.kind === ts.SyntaxKind.BinaryExpression;
}

function isFirstAssignment(kind: ts.SyntaxKind): kind is ts.SyntaxKind.FirstAssignment {
  return kind === ts.SyntaxKind.FirstAssignment;
}

function hasBetweenType(str: string) {
  return BETWEEN_TYPE_IN_STRING_REGEX.test(str);
}

function isBetweenType(str: string) {
  return BETWEEN_TYPE_REGEX.test(str);
}

module.exports = function(module: TypeScriptModule) {
  return {
    create: (info: ts.server.PluginCreateInfo) => createBetweenPlugin(info, module)
  };
};
