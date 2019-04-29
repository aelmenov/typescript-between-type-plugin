import * as ts from 'typescript/lib/tsserverlibrary';

import { createBetweenPlugin } from './plugin';
import { TypeScriptModule } from './types';

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
