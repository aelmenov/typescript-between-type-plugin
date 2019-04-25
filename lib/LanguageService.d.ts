import * as ts from 'typescript/lib/tsserverlibrary';
import { LanguageServiceLogger } from './LanguageServiceLogger';
export declare class NRangeLanguageService {
    private readonly logger;
    private readonly currentLanguageService;
    private readonly program;
    constructor(currentLanguageService: ts.LanguageService, logger: LanguageServiceLogger);
    getCurrentSemanticDiagnostics(fileName: string): ts.Diagnostic[];
    getNextSemanticDiagnostics(fileName: string): ts.Diagnostic[];
    getNextLanguageService(): ts.LanguageService;
    getCurrentLanguageService(): ts.LanguageService;
    getSourceFile(fileName: string): ts.SourceFile;
    private reportError;
    private getProblemSpan;
    private visitAllNodes;
    private isVariableDeclaration;
}
