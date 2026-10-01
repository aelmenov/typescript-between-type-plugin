# Numeric aliases

Enable the global declarations through `compilerOptions.types` as described in
[the README](../README.md). Names use PascalCase in TypeScript.

Every alias is a `Between<Min, Max>` range with inclusive bounds. Fractions are
allowed for every alias. There is no integer, precision, storage-format,
underflow, or runtime conversion check.

## Available ranges

The following are the source spellings of the bounds; JavaScript may round them
when reading a numeric literal.

| Alias     | Minimum                          | Maximum                         |
| --------- | -------------------------------- | ------------------------------- |
| `SByte`   | `-128`                           | `127`                           |
| `Byte`    | `0`                              | `255`                           |
| `Short`   | `-32768`                         | `32767`                         |
| `UShort`  | `0`                              | `65535`                         |
| `Int`     | `-2147483648`                    | `2147483647`                    |
| `UInt`    | `0`                              | `4294967295`                    |
| `Long`    | `-9223372036854775808`           | `9223372036854775807`           |
| `ULong`   | `0`                              | `18446744073709551615`          |
| `Float`   | `-3.4028234663852886e38`         | `3.4028234663852886e38`         |
| `Double`  | `-1.7976931348623157e308`        | `1.7976931348623157e308`        |
| `Decimal` | `-79228162514264337593543950335` | `79228162514264337593543950335` |

`Float` uses the finite binary32 extrema, represented in binary64. `Double` uses
the finite binary64 extrema. Both accept values between their bounds, including
values too small to represent in binary32.

## Precision limitations

Bounds and checked values use JavaScript `number`. The bounds of `Long`, `ULong`,
and `Decimal` are not all exactly representable in binary64. Declarations and the
built-in registry retain their decimal spellings, but comparisons use the rounded
JavaScript values.

For example, the `Long` upper bound `9223372036854775807` and the mathematical
value immediately above it, `9223372036854775808`, become the same JavaScript
number. The current rule cannot distinguish them and accepts both literals.
The same issue affects other large bounds and close values. These aliases do
not provide arbitrary precision or decimal arithmetic.

## Resolution

The rule recognizes these global names from its built-in registry when there is
no local or imported type declaration with that name. Local and imported aliases,
alias chains, generic aliases, and supported unions take precedence. Avoid
unrelated ambient globals with these names outside the analyzed import graph.

```ts
type Channel = Byte;
let channel: Channel = 128.5; // Valid
channel = 256; // Error

{
  type Byte = Between<0, 500>;
  const extended: Byte = 300; // Valid
}
```
