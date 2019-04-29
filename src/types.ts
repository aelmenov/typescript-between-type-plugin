import * as ts from 'typescript/lib/tsserverlibrary';

export type Action<K, V> = (keyValue: [ K, V ]) => void;

export type TypeScriptModule = {
  typescript: typeof ts;
};
