import * as ts from 'typescript/lib/tsserverlibrary';

import { PLUGIN_NAME, reports, OUT_OF_RANGE_CODE } from './config';
import { LanguageServiceLogger } from './LanguageServiceLogger';
import { NRange } from './NRange';

export class NRangeLanguageService {
    private readonly logger: LanguageServiceLogger;
    private readonly currentLanguageService: ts.LanguageService;
    private readonly program: ts.Program;

    constructor(currentLanguageService: ts.LanguageService, logger: LanguageServiceLogger) {
        this.logger = logger;
        this.currentLanguageService = currentLanguageService;
        this.program = currentLanguageService.getProgram() as ts.Program;
    }

    public getCurrentSemanticDiagnostics(fileName: string) {
        return this.currentLanguageService.getSemanticDiagnostics(fileName);
    }

    public getNextSemanticDiagnostics(fileName: string) {
        const previousSymanticDiagrnostics = this.getCurrentSemanticDiagnostics(fileName) || [];
        const sourceFile = this.getSourceFile(fileName);
        const errors: ts.Diagnostic[] = [];

        this.visitAllNodes(sourceFile, node => {
            if (this.isVariableDeclaration(node)) {
                const nrange = new NRange(node.type as ts.TypeNode);
                const [ min, max ] = nrange.getRange();

                if (min > -10 || -10 > max) {
                    errors.push(this.reportError(OUT_OF_RANGE_CODE, node, sourceFile));
                }
            }
        });

        return [ ...previousSymanticDiagrnostics, ...errors ];
    }

    public getNextLanguageService(): ts.LanguageService {
        return { ...this.currentLanguageService };
    }

    public getCurrentLanguageService() {
        return this.currentLanguageService;
    }

    public getSourceFile(fileName: string) {
        return this.program.getSourceFile(fileName) as ts.SourceFile;
    }

    private reportError(code: number, node: ts.VariableDeclaration, sourceFile: ts.SourceFile): ts.Diagnostic {
        const [ start, length ] = this.getProblemSpan(node);

        return {
            file: sourceFile,
            start, length,
            messageText: reports.errors[code],
            category: ts.DiagnosticCategory.Error,
            source: PLUGIN_NAME, code
        };
    }

    private getProblemSpan(node: ts.VariableDeclaration): [ number, number ] {
        return [
            node.name.getStart(),
            node.name.getEnd() - node.getStart()
        ];
    }

    private visitAllNodes(node: ts.Node, visitor: (node: ts.Node) => void) {
        visitor(node);

        node.forEachChild(child => this.visitAllNodes(child, visitor));
    }

    private isVariableDeclaration(node: ts.Node): node is ts.VariableDeclaration {
        return node.kind === ts.SyntaxKind.VariableDeclaration;
    }
}
