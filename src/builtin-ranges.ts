import type { Range } from './range.js';

// Decimal strings preserve the documented bounds before conversion to number.
// Tests verify that this registry agrees with lib.between.d.ts.
export const builtinBounds = {
  SByte: ['-128', '127'],
  Byte: ['0', '255'],
  Short: ['-32768', '32767'],
  UShort: ['0', '65535'],
  Int: ['-2147483648', '2147483647'],
  UInt: ['0', '4294967295'],
  Long: ['-9223372036854775808', '9223372036854775807'],
  ULong: ['0', '18446744073709551615'],
  Half: ['-65504', '65504'],
  Float: ['-3.4028234663852886e38', '3.4028234663852886e38'],
  Double: ['-1.7976931348623157e308', '1.7976931348623157e308'],
  Decimal: ['-79228162514264337593543950335', '79228162514264337593543950335'],
  Int128: ['-170141183460469231731687303715884105728', '170141183460469231731687303715884105727'],
  UInt128: ['0', '340282366920938463463374607431768211455'],
  NInt32: ['-2147483648', '2147483647'],
  NUInt32: ['0', '4294967295'],
  NInt64: ['-9223372036854775808', '9223372036854775807'],
  NUInt64: ['0', '18446744073709551615'],
} as const;

export function getBuiltinRange(name: string): Range | undefined {
  if (!Object.hasOwn(builtinBounds, name)) return undefined;
  const [min, max] = builtinBounds[name as keyof typeof builtinBounds];
  return [Number(min), Number(max)];
}
