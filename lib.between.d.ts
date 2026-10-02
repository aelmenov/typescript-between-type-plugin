declare type Between<Min extends number, Max extends number> = number;

declare type SByte = Between<-128, 127>;
declare type Byte = Between<0, 255>;
declare type Short = Between<-32768, 32767>;
declare type UShort = Between<0, 65535>;
declare type Int = Between<-2147483648, 2147483647>;
declare type UInt = Between<0, 4294967295>;
declare type Long = Between<-9223372036854775808, 9223372036854775807>;
declare type ULong = Between<0, 18446744073709551615>;
declare type Float = Between<-3.4028234663852886e38, 3.4028234663852886e38>;
declare type Double = Between<-1.7976931348623157e308, 1.7976931348623157e308>;
declare type Decimal = Between<-79228162514264337593543950335, 79228162514264337593543950335>;
