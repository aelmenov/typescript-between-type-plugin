import * as ts from 'typescript/lib/tsserverlibrary';

export type Walker = (node: ts.Node) => void;

export type NamedNodeParameters = {
  name: string;
  span: ts.TextSpan;
  hash: number;
};
