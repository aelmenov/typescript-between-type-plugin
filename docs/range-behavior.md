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
