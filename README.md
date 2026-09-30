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

`build` runs lint, compilation, and tests. `compile` builds only the plugin;
`compile:watch` rebuilds it during development. Tests use inline source strings;
behavior examples live in [docs/range-behavior.md](docs/range-behavior.md).

The package is now named `eslint-plugin-between`. The old TypeScript language
service entry point and TSLint configuration have been removed.

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

Remove the old entry from `compilerOptions.plugins`. In VS Code, enable the
ESLint extension for TypeScript files. Diagnostics now come from ESLint.

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

The global declarations include `Byte`, `Short`, `Int`, `Long`, their unsigned
counterparts, `SByte`, `Half`, `Float`, `Double`, `Decimal`, `Int128`, `UInt128`,
and explicit 32-bit and 64-bit native-range variants.

```ts
type Channel = Byte;
let channel: Channel = 128.5; // Valid: range checking only
channel = 256; // Error
```

See [numeric aliases](docs/numeric-aliases.md) for the full list, .NET source
references, and JavaScript precision limitations at large bounds.

## Analysis

The rule supports local and imported aliases, re-exports, namespace imports,
generic aliases with defaults, interval arithmetic, reassignment, compound
assignments, increments, function parameters and returns, typed object
properties, arrays, tuples, records, and basic destructuring.

Comparisons narrow numeric variables inside branches. Branch results are merged;
loops are analyzed conservatively instead of being unrolled. Calls invalidate
mutable facts because they may have side effects. Assertions do not prove a range.

Diagnostics distinguish a definite violation, a possible violation, an unknown
value, and an invalid range declaration. See [the rule documentation](docs/rules/within-range.md)
for examples, options, and the supported proof boundaries. This is a conservative
static analyzer, not a complete verifier of arbitrary TypeScript programs.

## License

MIT. See [LICENSE](LICENSE).
