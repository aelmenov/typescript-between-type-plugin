import { server } from 'typescript/lib/tsserverlibrary';

import { PLUGIN_NAME } from './config';

export class LanguageServiceLogger {
    private readonly _info: server.PluginCreateInfo;

    constructor(info: server.PluginCreateInfo) {
        this._info = info;
    }

    public log(message: string) {
        this._info.project.projectService.logger.info(`[${PLUGIN_NAME}] ${message}`);
    }
}
