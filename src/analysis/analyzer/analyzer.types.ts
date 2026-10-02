import type ts from 'typescript';
import type { Shape } from '../domain/domain.types.js';

export type State = Map<ts.Declaration, Shape>;

export type Message = 'outOfRange' | 'possibleOutOfRange' | 'unknownRange' | 'invalidRange';

export type Report = (node: ts.Node, message: Message, data: Record<string, string>) => void;

export type UnknownValues = 'error' | 'ignore';

export type CheckRange = (target: Shape, value: Shape, node: ts.Node) => void;

export type AnalyzeFunction = (
  node: ts.FunctionLikeDeclaration,
  outer: State,
  contextual?: Extract<Shape, { kind: 'function' }>,
) => Shape;
