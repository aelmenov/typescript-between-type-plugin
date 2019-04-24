import * as ts from 'typescript/lib/tsserverlibrary';
import { LanguageServiceLogger } from './LanguageServiceLogger';

export class NRangeLanguageService {
    private readonly typescript: typeof ts;
    private readonly logger: LanguageServiceLogger;

    constructor(typescript: typeof ts, logger: LanguageServiceLogger) {
        this.typescript = typescript;
        this.logger = logger;
    }
}
