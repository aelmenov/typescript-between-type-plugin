import ts from 'typescript';
import { join } from './domain.util.js';
import type { Shape } from './domain.types.js';
import type { State } from '../analyzer/analyzer.types.js';
import type { FlowAnalysis } from '../flow/flow.interfaces.js';

export function isImmutable(declaration: ts.Declaration): boolean {
  return (
    ts.isVariableDeclaration(declaration) &&
    !!(declaration.parent.flags & ts.NodeFlags.Const)
  );
}

export function mergeStates(
  analysis: FlowAnalysis,
  target: State,
  a: State,
  b: State,
): void {
  const entries = new Map<ts.Declaration, Shape>();

  for (const declaration of new Set([...a.keys(), ...b.keys()]))
    entries.set(
      declaration,
      join(
        a.get(declaration) ?? analysis.declared(declaration),
        b.get(declaration) ?? analysis.declared(declaration),
      ),
    );

  target.clear();

  for (const entry of entries) target.set(...entry);
}
