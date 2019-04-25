"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript/lib/tsserverlibrary");
const config_1 = require("./config");
class NRangeLanguageService {
    constructor(currentLanguageService, logger) {
        this.logger = logger;
        this.currentLanguageService = currentLanguageService;
        this.program = currentLanguageService.getProgram();
    }
    getCurrentSemanticDiagnostics(fileName) {
        return this.currentLanguageService.getSemanticDiagnostics(fileName);
    }
    getNextSemanticDiagnostics(fileName) {
        const previousSymanticDiagrnostics = this.getCurrentSemanticDiagnostics(fileName) || [];
        const sourceFile = this.getSourceFile(fileName);
        const errors = [];
        this.visitAllNodes(sourceFile, node => {
            if (this.isVariableDeclaration(node)) {
            }
        });
        return [...previousSymanticDiagrnostics, ...errors];
    }
    getNextLanguageService() {
        return { ...this.currentLanguageService };
    }
    getCurrentLanguageService() {
        return this.currentLanguageService;
    }
    getSourceFile(fileName) {
        return this.program.getSourceFile(fileName);
    }
    reportError(code, node, sourceFile) {
        const [start, length] = this.getProblemSpan(node);
        return {
            file: sourceFile,
            start, length,
            messageText: config_1.reports.errors[code],
            category: ts.DiagnosticCategory.Error,
            source: config_1.PLUGIN_NAME, code
        };
    }
    getProblemSpan(node) {
        return [
            node.name.getStart(),
            node.name.getEnd() - node.getStart()
        ];
    }
    visitAllNodes(node, visitor) {
        visitor(node);
        node.forEachChild(child => this.visitAllNodes(child, visitor));
    }
    isVariableDeclaration(node) {
        return node.kind === ts.SyntaxKind.VariableDeclaration;
    }
}
exports.NRangeLanguageService = NRangeLanguageService;
