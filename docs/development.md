# Development conventions

## Responsibilities

The package entry point, `src/index.ts`, exposes the plugin and its recommended
flat configuration. `src/rules/` contains the ESLint adapter and its option
contract. `src/ranges/` owns range tuples, formatting, and the built-in bounds.
The global declarations remain in `lib.between.d.ts` at the package root.

Analysis lives in `src/analysis/`, grouped by responsibility:

| Directory        | Responsibility                                                                 |
| ---------------- | ------------------------------------------------------------------------------ |
| `analyzer/`      | Statement traversal, function scopes, return inference, and analysis callbacks |
| `domain/`        | Value shapes, interval operations, member lookup, and state merging            |
| `evaluator/`     | Expression evaluation, declaration mapping, assignments, and call effects      |
| `flow/`          | Branch guards and the expression lookup contract used by flow analysis         |
| `program/`       | Creating a TypeScript program from editor text and compiler configuration      |
| `type-resolver/` | Type aliases, imported declarations, and generic bindings                      |
| `validation/`    | Checking range contracts, diagnostic locations, and duplicate suppression      |

Services and their types or interfaces stay in the same directory. For example,
`program/` contains both `program.factory.ts` and `program.interfaces.ts`.
`syntax.util.ts` stays at the analysis root because it supplies AST helpers used
across the analyzer, evaluator, type resolver, and validation modules.

The analyzer owns the current function environment. The expression evaluator
reads that environment through a callback so nested function analysis uses the
correct generic bindings. Function analysis callbacks allow expressions and
range checks to request return inference or contextual checking. These modules
do not import the analyzer implementation.

Import directly from the module that owns a symbol. Keep new models and helpers
next to their owner. Review a directory when it mixes several concepts or grows
to roughly 8–12 source files. Group related files by responsibility, with only a
few nesting levels. The package entry point is the only `index.ts`; internal
directories use direct imports.

Introduce an interface for a structural contract and a type alias for unions,
function signatures, and derived types. Avoid assertions when a predicate or
typed declaration can establish the contract.

## Readability

Separate setup, guards, state changes, and result construction with blank lines
when they are distinct stages. Keep related declarations together. In classes,
group fields, constructors, accessors, public methods, and private helpers. Use
the same separation between setup, execution, and assertions in tests.

Review source files as they approach several hundred lines. Files around 500
lines should be unusual; split normal source files approaching 1000 lines along
meaningful responsibilities. Keep program creation, expression evaluation,
diagnostics, and control flow in their own modules. Prettier handles mechanical
formatting and preserves semantic blank lines.

## Boundaries

The ESLint option schema validates user configuration. TypeScript owns parsing
source and compiler configuration. Internal modules use typed contracts without
duplicating runtime validation. Unknown source values remain explicit analyzer
states and follow the configured `unknownValues` policy.

## Verification

The tool configurations are `eslint.config.ts`, `jest.config.ts`, and
`prettier.config.ts`. `npm run config:typecheck` checks their types. ESLint loads
its config through Jiti; Jest uses esbuild-register; the formatting commands load
Prettier through tsx. These loaders support the package's Node.js 20 baseline.

ESLint uses [Airbnb Extended](https://github.com/eslint-config/airbnb-extended)
with TypeScript rules. Its published peer range requires ESLint 9, which is used
for development. The plugin supports consuming projects on ESLint 9 and 10.
`eslint-config-prettier` disables conflicting formatting rules. Prettier uses
two spaces, single quotes, semicolons, trailing commas, and a width of 100.

The project keeps named exports and the `.js` import extensions required by
NodeNext. Single-line class fields can stay grouped. Traversal allows `for...of`
and `continue`, while bitwise operators are allowed inside `src/analysis/` for
TypeScript flags and evaluated expressions. Other Airbnb checks remain active.

Run `npm ci` and `npm run build`. The build compiles the plugin before checking
Prettier formatting, ESLint, types of tests and tool configurations, and the Jest
suite. All TypeScript checks use strict settings. Compilation emits JavaScript
and TypeScript declarations into `lib/`; source files remain in `src/`.

Tests exercise the public ESLint API, diagnostic locations and messages, numeric
bounds, module resolution, imported declaration changes, and ambient declaration
loading. Temporary consumer projects are created before each integration test and
removed after it, including when an assertion fails. Source snippets deliberately
include invalid TypeScript to test diagnostics. Test titles explain the behavior,
and each example keeps its source, lint invocation, and expected diagnostics
together. See [testing conventions](testing.md) for commands and suite ownership.

Function-analysis tests also check nested return contracts, generic scope
restoration, repeated inferred returns, and duplicate diagnostics through the
public ESLint API.

Update the rule documentation and behavior examples when changing supported
analysis. Preserve the spelling of large bounds in declarations and the registry;
tests check their agreement and JavaScript precision limitations remain documented.
