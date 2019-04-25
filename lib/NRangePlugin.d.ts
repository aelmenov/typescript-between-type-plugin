import * as ts from 'typescript/lib/tsserverlibrary';
export declare class NRangePlugin {
    private readonly typescript;
    constructor(typescript: typeof ts);
    create(info: ts.server.PluginCreateInfo): ts.LanguageService;
}
