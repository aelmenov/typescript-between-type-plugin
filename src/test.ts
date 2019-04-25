import * as ts from 'typescript/lib/tsserverlibrary';

type TSModule = {
    typescript: typeof ts
};

type Reports = {
    [category: string]: {
        [code: number]: string;
    }
}

const PLUGIN_NAME = 'typescript-nrange-type-plugin';

const OUT_OF_RANGE_CODE = 0xf101;

const reports: Reports = {
    errors: {
        [OUT_OF_RANGE_CODE]: `Out of range error.`
    }
}

const REXEX = /^nrange\<[\-]?([\d]+|Infinity){1}\,[\s]*[\-]?([\d]+|Infinity){1}\>$/;
const NUMBER_REXEX = /[\-]?([\d]+|Infinity){1}/g;

export function plugin(module: TSModule) {
    const ts = module.typescript;

    return {
        create(info: ts.server.PluginCreateInfo) {
            const nextLanguageService = { ...info.languageService };
            const { getSemanticDiagnostics } = info.languageService;

            nextLanguageService.getSemanticDiagnostics = (fileName: string) => {
                const program = info.languageService.getProgram();
                const previous = getSemanticDiagnostics(fileName) || [];
                const errors: ts.Diagnostic[] = [];

                if (program) {
                    const sourceFile = program.getSourceFile(fileName);

                    if (sourceFile) {
                        visitAllNodes(sourceFile, node => {
                            if (isVariableDeclaration(node)) {
                                const types = node.type;

                                if (types && REXEX.test(types.getText())) {
                                    const [ min, max ] = getRange(types);
                                    const initializer = node.initializer;

                                    if (initializer) {
                                        const value = +initializer.getText();

                                        if (typeof value === 'number') {
                                            if (min > value || value > max) {
                                                const [ start, length ] = getProblemSpan(node);

                                                errors.push({
                                                    file: sourceFile,
                                                    start, length,
                                                    messageText: initializer.getText(),
                                                    category: ts.DiagnosticCategory.Message,
                                                    source: PLUGIN_NAME,
                                                    code: 1
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }
                }

                return [...previous, ...errors];
            };

            return nextLanguageService;
        }
    };
};

function reportError(code: number, node: ts.VariableDeclaration, sourceFile: ts.SourceFile): ts.Diagnostic {
    const [ start, length ] = getProblemSpan(node);

    return {
        file: sourceFile,
        start, length,
        messageText: reports.errors[code],
        category: ts.DiagnosticCategory.Error,
        source: PLUGIN_NAME, code
    };
}

function getProblemSpan(node: ts.VariableDeclaration): [ number, number ] {
    return [
        node.name.getStart(),
        node.name.getEnd() - node.getStart()
    ];
}

function visitAllNodes(node: ts.Node, visitor: (node: ts.Node) => void) {
    visitor(node);

    node.forEachChild(child => visitAllNodes(child, visitor));
}

function isVariableDeclaration(node: ts.Node): node is ts.VariableDeclaration {
    return node.kind === ts.SyntaxKind.VariableDeclaration;
}

function getRange(type: ts.TypeNode): [ number, number ] {
    let min = 0;
    let max = 0;

    const types = type.getText().trim().split('|')

    types.forEach(type => {
        if (REXEX.test(type)) {
            const parsedRange = type.match(NUMBER_REXEX);

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
