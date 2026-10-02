import type ts from 'typescript';
import { unknown } from '../domain/domain.util.js';
import type { Binding, Environment } from '../domain/domain.types.js';

export function bindTypeParameters(
  parameters: ts.NodeArray<ts.TypeParameterDeclaration> | undefined,
  args: readonly ts.TypeNode[] | undefined,
  outer: Environment,
): Environment {
  if (!parameters?.length) return outer;

  const env = new Map(outer);

  parameters.forEach((parameter, index) => {
    const argument = args?.[index];
    const fallback = parameter.default ?? parameter.constraint;
    let binding: Binding = unknown;

    if (argument) binding = { node: argument, env: outer };
    else if (fallback) binding = { node: fallback, env: new Map(env) };

    env.set(parameter.name.text, binding);
  });

  return env;
}
