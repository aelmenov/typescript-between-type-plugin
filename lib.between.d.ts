/**
 * Type difinition for Between type.
 *
 * First generic type is the start of number range.
 *
 * Last generic type is the end of number range.
 */
declare type Between<S extends number, E extends number> = number;

/**
 * Type definition for Infinity type. This is simple number type like Number.Infinity.
 */
declare type Infinity = number;
