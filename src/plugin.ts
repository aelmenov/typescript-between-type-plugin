import * as ts from 'typescript/lib/tsserverlibrary';

import { createBetweenLanguageService, getLanguageService } from './language-service';
import { setProject } from './project';
import { INVALID_TYPESCRIPT_VERSION } from './reports/config';
import { reportMessageList } from './reports/report-message-list';
import { TypeScriptModule } from './types';
import { log } from './utils';
import { isValidTypeScriptVersion } from './verificators';

export function createBetweenPlugin(info: ts.server.PluginCreateInfo, module: TypeScriptModule) {
  if (isValidTypeScriptVersion(module.typescript)) {
    log(info, reportMessageList.log[INVALID_TYPESCRIPT_VERSION]);
  }

  setProject({
    languageService: getLanguageService(info),
    betweenNodeList: { }
  });

  return createBetweenLanguageService(info);
}
