import * as ts from 'typescript/lib/tsserverlibrary';
import { isValidTypeScriptVersion } from './utils';
import { LanguageServiceLogger } from './LanguageServiceLogger';
import { NRangeLanguageService } from './LanguageService';

export class NRangePlugin {
    private readonly typescript: typeof ts;

    constructor(typescript: typeof ts) {
        this.typescript = typescript;
    }

    public create(info: ts.server.PluginCreateInfo) {
        const logger = new LanguageServiceLogger(info);

        if (!isValidTypeScriptVersion(this.typescript)) {
            logger.log('Invalid TypeScript version detected. TypeScript 3.x required.');

            return info.languageService;
        }

        const nRangeService = new NRangeLanguageService(info.languageService, logger);

        const languageService = nRangeService.getNextLanguageService();

        languageService.getSemanticDiagnostics = nRangeService.getNextSemanticDiagnostics;

        return languageService;
    }
}
