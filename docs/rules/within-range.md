# between/within-range

Check inclusive numeric ranges at assignments and function boundaries. The rule
provides no automatic fixes because changing a numeric value can alter behavior.

## Diagnostics

| Message ID | Meaning |
| --- | --- |
| `outOfRange` | The known value or all possible numeric values are outside the target. |
| `possibleOutOfRange` | Some possible values, or a possible NaN, violate the target. |
| `unknownRange` | The analyzer cannot prove that the value satisfies the target. |
| `invalidRange` | The range has invalid bounds, arguments, recursion, or an unsupported range-bearing type construct. |

Unknown values are errors by default. The optional compatibility setting below
ignores unknown values, but still reports known or possible violations:

```js
{
  rules: {
    'between/within-range': ['error', { unknownValues: 'ignore' }],
  },
}
```

## Assignments and arithmetic

```ts
const base = 250;
const channel: Byte = base + 10; // Error: 260
let current: Byte = 255;
current++; // Error: 256

function sum(a: Between<0, 100>, b: Between<0, 100>): Byte {
  return a + b; // Valid: 0...200
}
function increment(value: Byte): Byte {
  return value + 1; // Possible violation: 1...256
}
```

The analyzer tracks scalar values through sequential assignments and merges
numeric possibilities after branches. It supports numeric `+`, `-`, `*`, `/`,
`%`, `**`, unary signs, bitwise operations, compound assignments, and increments.
Division through a range containing zero and nonconstant fractional powers can
produce an unknown result. Bitwise operations follow JavaScript's 32-bit coercion
semantics; the range types themselves never require integer values.

All computation uses JavaScript `number`, including rounding, infinity, and NaN.
`0.1 + 0.2` exceeds `Between<0, 0.3>`. A computed NaN is outside every range.
Only the final result of an expression has the destination range; intermediate
values do not implicitly acquire it. [Large bound limitations](../numeric-aliases.md#precision-limitations)
still apply.

## Narrowing and unknown values

```ts
function checked(value: number): Byte {
  if (value >= 0 && value <= 255) return value; // Valid
  return 0;
}
function unchecked(value: number): Byte {
  return value; // Error: the range is not confirmed
}
const external: Byte = readInput() as Byte; // Error: assertions are not proof
```

Supported guards include ordered comparisons and strict equality for numeric
identifiers, conjunction, disjunction, negation, `typeof value === 'number'`,
and an unshadowed `Number.isFinite(value)`. Early returns preserve the remaining
branch's information. Strict inequalities use conservative inclusive endpoints.
A negative guard such as `if (value < 0 || value > 255) return` does not exclude
NaN by itself.

Mutable scalar facts and aggregate facts are invalidated after calls. Aggregate
aliases are invalidated after a property or element mutation. Loops widen mutable
values before checking their bodies; arbitrary loop invariants are not inferred.
Other control flow is traversed with conservative state invalidation. These
choices can produce diagnostics for safe code that needs a more explicit guard.

## Functions and data structures

Parameters, explicit returns, inferred simple returns, expression-bodied arrows,
contextually typed function expressions, default parameters, and rest parameters
are checked. Object properties, nested objects, class properties, constructors,
array elements, tuples, records, literal spreads, and basic destructuring are
supported. Array `push`, `unshift`, `splice`, and `fill` check inserted values.

```ts
interface Color { red: Byte; }
const color: Color = { red: 256 }; // Error
const channels: Byte[] = [0, 255];
channels.push(256); // Error
function paint(red: Byte): void {}
paint(256); // Error
```

External and annotated function return types are contracts. Lint all project
source files to check their implementations too. Calls to code without a known
return contract produce unknown values at a constrained destination.

## Aliases and imports

```ts
type Positive<Max extends number = 255> = Between<0, Max>;
type Channel = Positive;
const channel: Channel = 256; // Error
```

Alias arguments, defaults, and literal aliases used as bounds are resolved before
comparison. Module resolution uses the nearest `tsconfig.json`, including `paths`,
and supports named imports, namespace imports, and re-exports. Imported source
is read on each lint pass, so changes are not hidden by a process-wide cache.

`Between` remains the syntactically recognized range marker. Built-in numeric
names are fallback globals; local or imported declarations take precedence.
A union with unrestricted `number` permits every number. Unions made entirely
of ranges preserve gaps between their members.

## Range declarations

`Between` requires two finite numeric bounds with `Min <= Max`. Negative and
fractional bounds and equal endpoints are allowed. Reversed bounds, NaN,
infinity, nonliteral bounds that cannot resolve to numeric literals, and cyclic
aliases produce errors. No normalization silently swaps the endpoints.

## Proof boundaries

This rule does not implement the entire TypeScript type system. Conditional and
mapped types containing ranges, complex overload selection, arbitrary generic
function inference, correlated values, reflective mutation, dynamic property
names, and custom collection APIs do not have complete models. Unsupported
source values at a recognized constrained destination are reported as unknown;
unsupported type constructs directly containing ranges are diagnosed separately.

Run TypeScript alongside ESLint: unresolved modules, ordinary type errors,
missing properties, and missing declarations are the compiler's responsibility.
Files imported for declaration lookup are not recursively linted. Ambient types
outside the current file/import graph are not automatically loaded. Use explicit
imports for custom range types and lint the whole project in CI.

No runtime validation, automatic wrapping, clamping, or integer checks are added.
