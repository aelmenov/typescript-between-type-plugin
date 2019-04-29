import * as ts from 'typescript/lib/tsserverlibrary';
import { createSpan } from '../utils';
import { createBetweenNodeHash } from '../between';
import { NamedNodeParameters } from './types';

export function getNamedNodeParameters(node: ts.Node): NamedNodeParameters | void {
  if (node.hasOwnProperty('name')) {
    const nameNode = (node as any).name;

    const name = nameNode.getText();
    const span = createSpan(nameNode.getStart(), nameNode.getEnd());
    const hash = createBetweenNodeHash(name, span.start, span.length);

    return { name, span, hash };
  }
}
