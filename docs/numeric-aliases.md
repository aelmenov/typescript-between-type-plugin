# Numeric aliases

Enable the global declarations through `compilerOptions.types` as described in
[the README](../README.md). Names use PascalCase in TypeScript.

Every alias is a `Between<Min, Max>` range with inclusive bounds. Fractions are
allowed even for aliases named after C# integer types. There is no integer,
precision, storage-format, underflow, or runtime conversion check.

## Available ranges

The following are the source spellings of the bounds; JavaScript may round them
when reading a numeric literal.

| Alias | Minimum | Maximum |
| --- | --- | --- |
| `SByte` | `-128` | `127` |
| `Byte` | `0` | `255` |
| `Short` | `-32768` | `32767` |
| `UShort` | `0` | `65535` |
| `Int` | `-2147483648` | `2147483647` |
| `UInt` | `0` | `4294967295` |
| `Long` | `-9223372036854775808` | `9223372036854775807` |
| `ULong` | `0` | `18446744073709551615` |
| `Half` | `-65504` | `65504` |
| `Float` | `-3.4028234663852886e38` | `3.4028234663852886e38` |
| `Double` | `-1.7976931348623157e308` | `1.7976931348623157e308` |
| `Decimal` | `-79228162514264337593543950335` | `79228162514264337593543950335` |
| `Int128` | `-170141183460469231731687303715884105728` | `170141183460469231731687303715884105727` |
| `UInt128` | `0` | `340282366920938463463374607431768211455` |
| `NInt32` | `-2147483648` | `2147483647` |
| `NUInt32` | `0` | `4294967295` |
| `NInt64` | `-9223372036854775808` | `9223372036854775807` |
| `NUInt64` | `0` | `18446744073709551615` |

`Float` uses the finite binary32 extrema, represented in binary64. `Double` uses
the finite binary64 extrema. All intermediate JavaScript numbers are allowed,
including values too small to be represented by the corresponding .NET type.

C# `nint` and `nuint` depend on the target process architecture. Select `NInt32`
or `NInt64`, and `NUInt32` or `NUInt64`, explicitly. The plugin does not infer a
.NET target from the machine running ESLint.

`Half`, `Int128`, and `UInt128` are additional .NET numeric types, rather than C#
keyword aliases. `char` is not a numeric preset here. `BigInteger` has no fixed
numeric bounds and is not modeled by a finite `Between` range.

## Precision limitations

Bounds and checked values both use JavaScript `number`. The declarations retain
the .NET bound spellings, but `Long`, `ULong`, `Int128`, `UInt128`, `Decimal`, and
the 64-bit native variants have bounds that are not all exactly representable.
This is range checking with binary64 precision, not exact .NET numeric validation.

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

// A local alias overrides the built-in name.
{
  type Byte = Between<0, 500>;
  const extended: Byte = 300; // Valid
}
```

## Sources

- [C# integral numeric types and native-sized ranges](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/integral-numeric-types)
- [Single.MaxValue](https://learn.microsoft.com/en-us/dotnet/api/system.single.maxvalue?view=net-10.0)
- [Double.MaxValue](https://learn.microsoft.com/en-us/dotnet/api/system.double.maxvalue?view=net-10.0)
- [Decimal.MaxValue](https://learn.microsoft.com/en-us/dotnet/api/system.decimal.maxvalue?view=net-10.0)
- [Half.MaxValue](https://learn.microsoft.com/en-us/dotnet/api/system.half.maxvalue?view=net-10.0)
- [.NET Int128 and UInt128 extrema](https://devblogs.microsoft.com/dotnet/announcing-dotnet-7-preview-6/)
