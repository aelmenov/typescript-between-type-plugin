import { PLUGIN_NAME } from './constants';

export function log(info: ts.server.PluginCreateInfo, messageText: string) {
  info.project.projectService.logger.info(`[${PLUGIN_NAME}] ${messageText}`);
}

export function getHash(source: string) {
  let hash = 0;

  if (source.length !== 0) {
      for (let char of source) {
          hash = (hash << 5) - hash + char.charCodeAt(0);
          hash |= 0;
      }
  }

  return hash;
}
