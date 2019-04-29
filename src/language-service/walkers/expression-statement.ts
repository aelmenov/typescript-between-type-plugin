import * as ts from 'typescript/lib/tsserverlibrary';

import { walkNodeList } from '.';
import { getBetweenNode, getCurrentLanguageService, getCurrentSourceFile, getProgram } from '../../project';
import { createReportListForAssignments } from '../../reports/assignment-errors';
import { createSpan } from '../../utils';
import { isVariableDeclaration } from '../../verificators';
import { getNamedNodeParameters } from '../utils';

export function expressionStatementWalker(node: ts.ExpressionStatement) {
  const program = getProgram();
  const sourceFile = getCurrentSourceFile();

  if (program && sourceFile) {
    const languageService = getCurrentLanguageService();
    const definitions = languageService.getDefinitionAtPosition(sourceFile.fileName, node.getStart());

    if (program && definitions) {
      const [ firstDefinition ] = definitions;

      const source = program.getSourceFile(firstDefinition.fileName);

      if (source) {
        walkNodeList(source, definitionNode => {
          if (isVariableDeclaration(definitionNode)) {
            if (definitionNode.getStart() === firstDefinition.textSpan.start) {
              const { type } = definitionNode;

              if (type) {
                const definitionNodeParameters = getNamedNodeParameters(definitionNode);

                if (definitionNodeParameters) {
                  const { hash } = definitionNodeParameters;
                  const betweenNode = getBetweenNode(hash);
                  const [ , valueString ] = node.expression.getText().split('=').map(x => x.trim());
                  const value = +valueString;
                  const expressionName = node.getFirstToken();

                  if (expressionName && value && !isNaN(value)) {
                    const span = createSpan(expressionName.getStart(), expressionName.getEnd());

                    betweenNode.value = value;

                    betweenNode.reportList = {
                      ...betweenNode.reportList,
                      ...createReportListForAssignments(betweenNode, span)
                    };
                  }
                }
              }
            }
          }
        });
      }
    }
  }
}
