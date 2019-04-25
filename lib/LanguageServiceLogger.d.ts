import { server } from 'typescript/lib/tsserverlibrary';
export declare class LanguageServiceLogger {
    private readonly _info;
    constructor(info: server.PluginCreateInfo);
    log(message: string): void;
}
