# Range behavior

`Between<Min, Max>` describes an inclusive numeric range.
Fractional values are allowed.

These examples specify the expected behavior of the ESLint plugin.

## Inclusive bounds

```ts
const lower: Between<0, 100> = 0; // Valid
const upper: Between<0, 100> = 100; // Valid
const middle: Between<0, 100> = 42.5; // Valid

const below: Between<0, 100> = -0.1; // Error
const above: Between<0, 100> = 100.1; // Error
```

## Negative and fractional bounds

```ts
const negative: Between<-100, -10> = -50; // Valid
const below: Between<-100, -10> = -101; // Error
const above: Between<-100, -10> = -9; // Error

const fractional: Between<-0.5, 0.5> = 0.25; // Valid
const outside: Between<-0.5, 0.5> = 0.75; // Error
```

## Equal bounds

```ts
const exact: Between<5, 5> = 5; // Valid
const outside: Between<5, 5> = 6; // Error
```

## Zero

```ts
const zero: Between<-1, 1> = 0; // Valid
const outside: Between<1, 10> = 0; // Error
```

## Reassignment

```ts
let value: Between<-10, 10> = 5; // Valid

value = -10; // Valid
value = 2.5; // Valid
value = 11; // Error
value = -11; // Error
```

## Local aliases

```ts
type Small = Between<0, 10>;
type Channel = Small;

let channel: Channel = 5.5; // Valid
channel = 11; // Error
```

## Built-in aliases

```ts
const channel: Byte = 128.5; // Valid
const outside: Byte = 256; // Error
const offset: Short = -32768; // Valid
const negative: UInt = -1; // Error
```

These names describe ranges only. See [numeric aliases](numeric-aliases.md)
for all bounds and precision limitations.

## Constant arithmetic

```ts
const sum: Byte = 250 + 10; // Error: 260
const difference: Byte = 10 - 20; // Error: -10
const product: Byte = 100 * 3; // Error: 300
const quotient: Byte = 255 / 2; // Valid: 127.5
const remainder: Byte = 1000 % 256; // Valid: 232
const power: Byte = 2 ** 8; // Error: 256
const nested: Byte = (100 + 50) * 2; // Error: 300
const reduced: Byte = 300 - 100; // Valid: 200
const overflow: Double = 1e308 * 2; // Error: Infinity
const invalid: Double = 0 / 0; // Error: NaN
const rounding: Between<0, 0.3> = 0.1 + 0.2; // Error: 0.30000000000000004

let channel: Byte = 0;
channel = 250 + 10; // Error: 260
```

Only the final assigned result is checked. Variables and declared function
contracts are also analyzed, as shown below.

## Variables and narrowing

```ts
const base = 250;
const overflow: Byte = base + 10; // Error: 260

function checked(value: number): Byte {
  if (value >= 0 && value <= 255) return value; // Valid
  return 0;
}
function unchecked(value: number): Byte {
  return value; // Error: unknown range
}
```

## Generic aliases and API boundaries

```ts
type Positive<Max extends number> = Between<0, Max>;
const invalid: Positive<10> = 11; // Error

function paint(red: Byte): void {}
paint(256); // Error
const channels: Byte[] = [0, 255, 256]; // Error on 256
const color: { red: Byte } = { red: 256 }; // Error
```

## Invalid declarations

```ts
type Reversed = Between<10, 0>; // Error
type NonFinite = Between<0, 1e309>; // Error
type NonLiteral = Between<0, number>; // Error
```
