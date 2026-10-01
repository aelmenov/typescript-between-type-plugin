import type ts from 'typescript';
import type { Shape } from '../domain/domain.types.js';
import type { State } from '../analyzer/analyzer.types.js';
import type { TypeResolver } from '../type-resolver/type-resolver.service.js';

export interface FlowAnalysis {
  readonly types: TypeResolver;
  value(node: ts.Expression, state: State): Shape;
  declared(declaration: ts.Declaration | undefined): Shape;
}
