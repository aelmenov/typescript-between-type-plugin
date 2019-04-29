import * as ts from 'typescript/lib/tsserverlibrary';

import { PLUGIN_NAME } from './config';
import { Action } from './types';

export function log(info: ts.server.PluginCreateInfo, messageText: string) {
  info.project.projectService.logger.info(`[${PLUGIN_NAME}] ${messageText}`);
}

export function createSpan(start: number, end: number) {
  return ts.createTextSpan(start, end - start);
}

export function forEach<T, V>(source: T, action: Action<keyof T, V>) {
  for (let prop in source) {
    if (source.hasOwnProperty(prop)) {
      action([ prop, source[prop] as any ]);
    }
  }
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
