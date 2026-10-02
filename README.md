# ESLint Plugin Between

Check inclusive numeric ranges in TypeScript with ESLint.
Assignments, arithmetic, function arguments, and return values are checked against
`Between<Min, Max>` and aliases such as `Byte`.

```ts
let opacity: Between<0, 1> = 0.5;
opacity = 1.5; // Error: outside [0, 1]
```

## Setup

```sh
npm install --save-dev eslint eslint-plugin-between @typescript-eslint/parser typescript
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

Add the declarations to `tsconfig.json`, keeping any existing `types` entries:

```json
{
  "compilerOptions": {
    "types": ["eslint-plugin-between/types"]
  }
}
```

Run `npx eslint .`. For editor diagnostics, enable the ESLint extension for
TypeScript files. No `parserOptions.project` setting is required.

## Examples

Function contracts:

```ts
function setChannel(value: Byte): Byte {
  return value;
}

setChannel(128); // Valid
setChannel(256); // Error: outside [0, 255]
```

Arithmetic and narrowing:

```ts
function brighten(channel: Byte): Byte {
  if (channel <= 245) {
    return channel + 10; // Valid: result is within [10, 255]
  }

  return 255;
}
```

Ranges are inclusive and allow fractions. Unknown values are errors by default.
Types erase to ordinary numbers: there is no runtime validation, clamping, or
wrapping. `tsc` alone does not check ranges; run ESLint alongside the compiler.

## Compatibility and documentation

ESLint 9 or 10 with flat config, TypeScript `>=5.0.0 <6.1.0`, and
Node.js `^20.19.0 || ^22.13.0 || >=24.0.0`. The package exports ESM JavaScript.

- [Rule options and limitations](docs/within-range.md)
- [Range behavior](docs/range-behavior.md) and [numeric aliases](docs/numeric-aliases.md)
- [Development](docs/development.md), [tests](docs/testing.md), and [performance](docs/performance.md)

For development: `npm ci`, `npm run build`, and `npm run check`.
`npm pack` creates a checked, installable archive.

MIT license. See [LICENSE](LICENSE).
