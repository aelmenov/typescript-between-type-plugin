# ESLint Plugin Between

An ESLint plugin for inclusive numeric ranges in TypeScript. It checks assignments,
arithmetic, and function boundaries against `Between<Min, Max>` in the editor
and the ESLint CLI. Unknown values are errors by default.
Fractional values are allowed; values are never clamped or wrapped.

```ts
let channel: Between<0, 255> = 128.5; // Valid
channel = 300; // Error
```

## Compatibility

- ESLint 9 or 10, using flat config and the current rule API.
- TypeScript `>=5.0.0 <6.1.0`, matching the supported parser range.
- Node.js `^20.19.0 || ^22.13.0 || >=24.0.0`.
- ESM plugin entry point.

TypeScript 6.1 and later require a compatibility review. TypeScript 7 support is
not claimed. The analyzer uses TypeScript's AST, symbol resolution, and module
resolver. It reads the nearest `tsconfig.json` for module-resolution options and
creates a per-file program with the current editor text and imported declarations.
No full standard-library type check is performed; run the compiler as well.

## Local development

```sh
npm ci
npm run build
```

`build` checks formatting and runs lint, compilation, and tests. `compile` builds
only the plugin; `compile:watch` rebuilds it during development. `npm test` compiles
the plugin, checks the types of the tests, and runs Jest. Tests are written in
TypeScript and grouped by behavior, with named scenarios and readable source
examples. See [testing conventions](docs/testing.md) for the suite layout and
commands, and [range behavior](docs/range-behavior.md) for supported examples.

Compilation writes ESM JavaScript and public TypeScript declarations to `lib/`.
The compiler uses strict typing and checks indexed access. `npm run format` formats
source, tests, configuration, and documentation; `npm run format:check` verifies them.
The ESLint, Jest, and Prettier configurations use TypeScript. Development linting
uses Airbnb Extended with TypeScript rules; Prettier handles the shared format.
`npm run benchmark` measures analysis on generated workloads. See
[analysis performance](docs/performance.md) for the measurements and cache boundaries.
Analysis separates statement traversal, expression evaluation, type resolution,
range checking, and diagnostics. Source is grouped into `analysis/`, `ranges/`,
and `rules/`; analysis subdirectories keep related implementations and contracts
together. See [development conventions](docs/development.md) for module
responsibilities, source structure, and verification.

## Use in another project

After building this checkout, install it as a local dependency together with
ESLint and its TypeScript parser:

```sh
npm install --save-dev /path/to/typescript-between-type-plugin eslint@^10 @typescript-eslint/parser@^8.71 typescript@~6.0
```

Create `eslint.config.mjs`:

```js
import parser from '@typescript-eslint/parser';
import between from 'eslint-plugin-between';

export default [
  {
    ...between.configs.recommended,
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { parser },
  },
];
```

The recommended config enables `between/within-range` as an error. It does not
select a parser or enable type-aware linting; the consuming config supplies the
parser. No `parserOptions.project` setting is required.

Add the global range declaration to your project's `tsconfig.json`. Preserve any
existing entries in `compilerOptions.types`:

```json
{
  "compilerOptions": {
    "types": ["eslint-plugin-between/types"]
  }
}
```

If migrating from the language-service plugin, remove its entry from
`compilerOptions.plugins`. In VS Code, enable the ESLint extension for TypeScript
files. Diagnostics come from ESLint.

To fail the consuming project's build on a range error, run ESLint before its
compiler:

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "build": "npm run lint && tsc"
  }
}
```

`tsc` alone does not check ranges. `Between` remains a `number` alias; there is
no runtime validation.

## Numeric aliases

The global declarations include `SByte`, `Byte`, `Short`, `UShort`, `Int`, `UInt`,
`Long`, `ULong`, `Float`, `Double`, and `Decimal`.

```ts
type Channel = Byte;
let channel: Channel = 128.5; // Valid: range checking only
channel = 256; // Error
```

See [numeric aliases](docs/numeric-aliases.md) for all bounds and JavaScript
precision limitations.

## Analysis

The rule supports local and imported aliases, re-exports, namespace imports,
generic aliases with defaults, interval arithmetic, reassignment, compound
assignments, increments, function parameters and returns, typed object
properties, arrays, tuples, records, and basic destructuring.

Comparisons narrow numeric variables inside branches. Branch results are merged;
loops are analyzed conservatively instead of being unrolled. Calls invalidate
mutable facts because they may have side effects. Assertions do not prove a range.

Diagnostics distinguish a definite violation, a possible violation, an unknown
value, and an invalid range declaration. See [the rule documentation](docs/within-range.md)
for examples, options, and the supported proof boundaries. This is a conservative
static analyzer, not a complete verifier of arbitrary TypeScript programs.

## License

MIT. See [LICENSE](LICENSE).
