/** An inclusive numeric range checked by eslint-plugin-between. */
// The parameters are consumed by the ESLint rule, not the compiler.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare type Between<Min extends number, Max extends number> = number;

// C#/.NET-inspired ranges only: fractional values remain valid.
// Large bounds are rounded to JavaScript number precision.
/* eslint-disable no-loss-of-precision -- Preserve the documented .NET bounds. */
declare type SByte = Between<-128, 127>;
declare type Byte = Between<0, 255>;
declare type Short = Between<-32768, 32767>;
declare type UShort = Between<0, 65535>;
declare type Int = Between<-2147483648, 2147483647>;
declare type UInt = Between<0, 4294967295>;
declare type Long = Between<-9223372036854775808, 9223372036854775807>;
declare type ULong = Between<0, 18446744073709551615>;
declare type Half = Between<-65504, 65504>;
declare type Float = Between<-3.4028234663852886e38, 3.4028234663852886e38>;
declare type Double = Between<-1.7976931348623157e308, 1.7976931348623157e308>;
declare type Decimal = Between<-79228162514264337593543950335, 79228162514264337593543950335>;
declare type Int128 = Between<-170141183460469231731687303715884105728, 170141183460469231731687303715884105727>;
declare type UInt128 = Between<0, 340282366920938463463374607431768211455>;
declare type NInt32 = Between<-2147483648, 2147483647>;
declare type NUInt32 = Between<0, 4294967295>;
declare type NInt64 = Between<-9223372036854775808, 9223372036854775807>;
declare type NUInt64 = Between<0, 18446744073709551615>;
