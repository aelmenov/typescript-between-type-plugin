"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
class LanguageServiceLogger {
    constructor(info) {
        this._info = info;
    }
    log(message) {
        this._info.project.projectService.logger.info(`[${config_1.PLUGIN_NAME}] ${message}`);
    }
}
exports.LanguageServiceLogger = LanguageServiceLogger;
