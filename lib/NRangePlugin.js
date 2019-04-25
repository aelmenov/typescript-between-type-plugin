"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const LanguageServiceLogger_1 = require("./LanguageServiceLogger");
const LanguageService_1 = require("./LanguageService");
class NRangePlugin {
    constructor(typescript) {
        this.typescript = typescript;
    }
    create(info) {
        const logger = new LanguageServiceLogger_1.LanguageServiceLogger(info);
        if (!utils_1.isValidTypeScriptVersion(this.typescript)) {
            logger.log('Invalid TypeScript version detected. TypeScript 3.x required.');
            return info.languageService;
        }
        const nRangeService = new LanguageService_1.NRangeLanguageService(info.languageService, logger);
        const languageService = nRangeService.getNextLanguageService();
        languageService.getSemanticDiagnostics = nRangeService.getNextSemanticDiagnostics;
        return languageService;
    }
}
exports.NRangePlugin = NRangePlugin;
