import type ts from 'typescript';
import type { Range } from '../../ranges/range.types.js';

export type Shape =
  | { kind: 'unknown' | 'any' | 'invalid' }
  | { kind: 'other'; tag: string }
  | { kind: 'number'; ranges: Range[]; nan: boolean }
  | { kind: 'object'; properties: Map<string, Shape>; index?: Shape }
  | { kind: 'array'; element: Shape; items?: Shape[] }
  | { kind: 'function'; declaration: ts.SignatureDeclaration; env: Environment }
  | { kind: 'union'; members: Shape[] };

export type Binding = { node: ts.TypeNode; env: Environment } | Shape;

export type Environment = ReadonlyMap<string, Binding>;
