import * as ts from 'typescript/lib/tsserverlibrary';

import { createBetweenPlugin } from './plugin';
import { TypeScriptModule } from './types';

module.exports = function(module: TypeScriptModule) {
  return {
    create: (info: ts.server.PluginCreateInfo) => createBetweenPlugin(info, module)
  };
};
