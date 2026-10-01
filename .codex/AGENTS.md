# TypeScript Engineering Rules

These rules apply to TypeScript projects unless a project-specific rule explicitly overrides them.

They complement the global engineering rules and contain TypeScript-specific conventions only.

## General

Write idiomatic TypeScript.

Use the type system to make code easier to understand and harder to misuse.

Prefer explicit domain models over loosely typed objects.

Do not use TypeScript only as annotated JavaScript. Use its type system where it improves correctness and readability.

Avoid unnecessary type-level complexity.

A simpler type that is easy to understand is usually better than a clever generic abstraction.

## Naming

Use names that describe intent.

Prefer domain terminology over generic technical terminology.

Use the same term for the same concept throughout the codebase.

Avoid vague names when a specific name is available.

Short or generic names are acceptable when their meaning is clear from the local context.

Avoid redundant names that repeat information already obvious from the surrounding context.

Use common TypeScript naming conventions consistently with the project.

## File organization

Keep different responsibilities in separate files when doing so improves navigation and ownership.

Use consistent suffixes for common file roles.

Preferred examples:

```text
user.types.ts
user.interfaces.ts
user.util.ts
user.service.ts
user.repository.ts
user.controller.ts
user.constants.ts
user.mapper.ts
user.factory.ts
```

Types should normally live in `*.types.ts`.

Interfaces should normally live in `*.interfaces.ts`.

Utilities should normally live in `*.util.ts` or `*.utils.ts`.

Services should normally live in `*.service.ts`.

Keep related files close to the feature or module they belong to.

Do not create large generic directories containing unrelated project-wide types, utilities, services, or constants when they naturally belong to a feature.

Prefer feature-local organization over dumping everything into global folders.

Do not put unrelated interfaces, types, constants, utility functions, and implementation code into the same file.

Small local declarations may remain next to their implementation when separating them would make navigation worse.

File separation exists to make responsibilities clearer, not to maximize file count.

## File size and decomposition

Large source files are a design smell.

A source file approaching several hundred lines should trigger a review of its responsibilities and internal structure.

Files around 500 lines or more should be uncommon and should remain that large only when keeping the code together clearly improves understanding.

Normal application source files approaching or exceeding 1000 lines should be split.

Do not keep a large file intact merely because all of its code belongs to the same broad feature.

Look for meaningful boundaries such as:

- types;
- interfaces;
- services;
- repositories;
- mappers;
- validation;
- serialization;
- API clients;
- orchestration;
- state management;
- utilities;
- domain logic.

Do not split files mechanically by line count.

The extracted file should represent a real concept or responsibility.

Do not create meaningless fragments such as:

```text
user-service-part-1.ts
user-service-part-2.ts
helpers-2.ts
misc-extra.ts
```

merely to reduce line count.

Generated code, schemas, migrations, static data, vendored code, and similar machine-oriented files may be exceptions.

When modifying an already oversized file, avoid adding another substantial responsibility to it when the affected code can be safely separated.

## Visual structure

Whitespace is part of code readability.

Use blank lines to separate distinct logical blocks.

A reader should be able to understand the rough structure of a function, method, or class by scanning it vertically.

Separate declarations and initial preparation from subsequent control flow.

Separate guards from the main operation.

Separate loops and conditions from unrelated setup or post-processing.

Separate data preparation from side effects when they represent different stages.

Separate side effects from result construction when doing so improves readability.

Prefer:

```ts
const user = await userService.getUser(userId);
const permissions = await permissionService.getPermissions(userId);

if (!user) {
  return null;
}

const profile = createProfile(user);
const access = resolveAccess(permissions);

return {
  profile,
  access,
};
```

over:

```ts
const user = await userService.getUser(userId);
const permissions = await permissionService.getPermissions(userId);
if (!user) {
  return null;
}
const profile = createProfile(user);
const access = resolveAccess(permissions);
return {
  profile,
  access,
};
```

Keep tightly related declarations together.

Do not insert blank lines between every statement.

A blank line should represent a logical boundary.

Different stages should look different when scanning the code.

Do not remove meaningful blank lines merely to make code visually shorter.

Do not replace useful whitespace with comments such as:

```ts
// Validation
// Processing
// Result
```

when naming and structure already communicate those stages.

## Functions and methods

Prefer clear, cohesive functions.

Functions should have one understandable purpose, but do not interpret that as a requirement to make every function tiny.

Avoid deeply nested control flow.

Prefer guard clauses where they make the main path clearer.

Do not split cohesive logic into many tiny functions merely to satisfy a style rule.

Extract a function when the extracted operation has a meaningful name or responsibility.

Do not extract code only to reduce line count.

Avoid hidden side effects.

Do not mutate function inputs unless mutation is intentional, expected, and clearer than copying.

Prefer one abstraction level within a function when practical.

When a function contains several distinct stages, separate them with blank lines.

For example:

```ts
async function createOrder(command: CreateOrderCommand): Promise<Order> {
  const customer = await customerRepository.get(command.customerId);
  const products = await productRepository.getMany(command.productIds);

  if (products.length === 0) {
    throw new EmptyOrderError();
  }

  const order = buildOrder(customer, products);

  await orderRepository.save(order);

  return order;
}
```

Do not write multi-stage functions as uninterrupted walls of statements.

Blank lines should expose structure without requiring explanatory comments.

## Classes

Use classes when they provide meaningful:

- state ownership;
- lifecycle;
- polymorphism;
- framework integration;
- domain behavior.

Do not create a class merely to group stateless functions.

Prefer plain functions or modules when no persistent object state or class-specific behavior is needed.

Keep classes cohesive.

Do not let service classes become dumping grounds for unrelated operations.

Do not split a cohesive class into many tiny classes merely to satisfy a pattern.

## Class structure

Keep classes visually organized.

Group related members together.

A typical class should usually follow a structure similar to:

```text
static constants

static fields

instance fields

constructor

getters / setters

public methods

protected methods

private methods
```

Adapt the exact order when another arrangement better fits the class or project conventions.

Separate distinct member groups with blank lines.

Separate methods visually.

Do not interleave fields, constructors, accessors, public methods, and private helpers without a reason.

Prefer:

```ts
class UserService {
  private readonly repository: UserRepository;
  private readonly logger: Logger;

  constructor(repository: UserRepository, logger: Logger) {
    this.repository = repository;
    this.logger = logger;
  }

  async getUser(id: UserId): Promise<User | null> {
    return this.repository.findById(id);
  }

  async updateUser(
    id: UserId,
    input: UpdateUserInput,
  ): Promise<User> {
    const user = await this.getRequiredUser(id);

    const updatedUser = applyUserUpdate(user, input);

    await this.repository.save(updatedUser);

    return updatedUser;
  }

  private async getRequiredUser(id: UserId): Promise<User> {
    const user = await this.repository.findById(id);

    if (!user) {
      throw new UserNotFoundError(id);
    }

    return user;
  }
}
```

Do not collapse class members or multi-stage method bodies into dense uninterrupted blocks.

If a class becomes difficult to navigate even with clear grouping, review whether it has accumulated too many responsibilities.

## Types and interfaces

Use `type` and `interface` intentionally.

Prefer `interface` for object contracts that describe a public structural API or are expected to be implemented or extended.

Prefer `type` for:

- unions;
- intersections;
- mapped types;
- conditional types;
- aliases;
- composed or derived types;
- function signatures where an interface adds no value.

Do not convert between `type` and `interface` without a reason.

Do not create interfaces only to satisfy an architectural pattern.

Avoid unnecessary one-to-one interface and implementation pairs when there is no meaningful abstraction boundary.

## Strict typing

Prefer strict typing.

Avoid `any`.

Use `unknown` when a value is genuinely unknown and must be validated or narrowed before use.

Do not replace a type error with `as any`.

Do not use broad type assertions merely to silence the compiler.

Type assertions should express knowledge that TypeScript cannot infer, not bypass type safety.

Prefer narrowing over casting.

Use runtime validation at external boundaries when TypeScript types cannot guarantee the shape of incoming data.

Examples include:

- HTTP input;
- third-party APIs;
- storage;
- user input;
- deserialized data;
- messages from external systems.

Do not add runtime validation between internal modules when the type system already establishes the contract and there is no untrusted boundary.

## Inference

Let TypeScript infer types when the inferred type is clear and stable.

Do not annotate obvious local variables unnecessarily.

Prefer:

```ts
const users = getUsers();
```

over:

```ts
const users: User[] = getUsers();
```

when the return type is already explicit and useful.

Add explicit types where they improve API clarity, protect a public boundary, or prevent accidental widening.

Public function return types should usually be explicit when they form part of a module contract.

## Object shapes

Prefer specific object types over generic containers.

Avoid structures such as:

```ts
Record<string, any>
Record<string, unknown>
object
{}
```

when the actual shape is known.

Use `Record` when the domain genuinely represents a key-value mapping.

Do not use index signatures merely because defining the real structure takes more work.

## Unions and enums

Prefer union types for small closed sets of values when runtime enum behavior is not required.

Example:

```ts
type Status = 'idle' | 'loading' | 'success' | 'error';
```

Use enums only when their runtime representation or enum semantics provide a concrete benefit.

Do not introduce enums automatically for every fixed list of values.

For shared runtime constants, a typed constant object may be preferable when it provides clearer JavaScript behavior.

## Null and undefined

Use `null` and `undefined` deliberately.

Do not mix them arbitrarily for the same semantic meaning.

Prefer one representation of absence within a given API.

Do not add optional properties simply to avoid constructing a complete object.

Use optional properties only when the property is genuinely optional.

Do not use non-null assertions as a substitute for proper narrowing.

Avoid:

```ts
value!
```

unless the invariant is guaranteed outside TypeScript's ability to prove it.

## Parameters

Prefer explicit parameters for small, clear argument lists.

Use an object parameter when arguments form a meaningful group, there are many optional arguments, or call-site readability improves.

Avoid boolean parameters that substantially change behavior.

Instead of:

```ts
loadUser(true);
```

prefer an explicit API when the distinction is meaningful.

Do not turn every parameter list into an options object without a reason.

## Return values

Return values should have predictable shapes.

Avoid functions that return unrelated types depending on hidden conditions.

Use discriminated unions when a result has several meaningful states.

Example:

```ts
type Result<T> =
  | { status: 'success'; value: T }
  | { status: 'error'; error: Error };
```

Do not create custom result wrappers when normal exceptions or ordinary return values are already appropriate.

## Async code

Use `async` and `await` when they make asynchronous flow easier to read.

Avoid unnecessary `Promise.resolve`, manual promise construction, or `.then()` chains when `async`/`await` is clearer.

Do not mark a function `async` if it does not need to be asynchronous.

Do not use:

```ts
return await value;
```

unless awaiting is required for local error handling, cleanup, stack behavior, or another concrete reason.

Run independent asynchronous operations concurrently when appropriate.

Do not serialize independent operations accidentally.

Do not use `Promise.all` when partial failure handling or sequencing matters.

Make concurrency deliberate.

## Error handling

Do not wrap every asynchronous function in `try/catch`.

Catch errors where the code can:

- recover;
- translate the error;
- add meaningful context;
- perform cleanup;
- map it to a boundary-specific response.

When catching unknown errors, narrow them safely.

Do not assume every caught value is an `Error`.

Avoid this unless the environment guarantees it:

```ts
catch (error) {
  console.error(error.message);
}
```

Prefer proper narrowing.

Do not create custom error classes unless they carry meaningful semantics or are used to distinguish failure categories.

## Generics

Use generics when the relationship between types matters.

Do not introduce generics only to make code look reusable.

Avoid deeply nested generic types that are harder to understand than the implementation they describe.

Name generic parameters by meaning when the type relationship is non-trivial.

Short names such as `T`, `K`, and `V` are fine for obvious generic roles.

Prefer constraints that describe real requirements.

Do not use generic constraints merely to satisfy the compiler.

## Utility types

Use built-in utility types where they clearly express intent.

Examples:

```text
Pick
Omit
Partial
Required
Readonly
Record
ReturnType
Parameters
```

Do not compose utility types into unreadable type puzzles.

If a derived type becomes difficult to understand, give it a meaningful name or define the structure directly.

Avoid excessive reuse of `Partial<T>` for update operations when only a specific subset of fields is actually valid.

## Immutability

Prefer immutable data when mutation does not provide a clear benefit.

Do not clone objects reflexively.

Avoid repeated object spreading when it makes code noisy or inefficient without improving correctness.

Mutation is acceptable when it is local, obvious, and simpler.

Do not mutate shared state unexpectedly.

Use `readonly` where it meaningfully communicates a contract, especially for public APIs and values that should not be modified.

Do not apply `readonly` mechanically to every type.

## Collections

Use array methods when they make intent clearer.

Prefer:

```text
map
filter
find
some
every
reduce
```

when they naturally express the operation.

Do not force functional chains when a loop is clearer.

Avoid long chains that combine transformation, filtering, mutation, and side effects.

A straightforward loop is often better than an unreadable sequence of array operations.

Use `reduce` when it genuinely represents accumulation.

Do not use `reduce` as a generic substitute for every loop.

## Loops and conditions

Keep control flow visually clear.

Separate setup from loops.

Separate loops from subsequent processing when they represent different stages.

Prefer:

```ts
const result: UserView[] = [];

for (const user of users) {
  if (!user.active) {
    continue;
  }

  result.push(buildUserView(user));
}

return result;
```

over dense control flow with no visible structure.

Avoid deeply nested conditions.

Use guard clauses or `continue` when they make the main path easier to follow.

Do not flatten logic mechanically if doing so makes behavior harder to understand.

## Destructuring

Use destructuring when it improves readability.

Do not destructure deeply nested objects merely because TypeScript supports it.

Avoid destructuring large objects into many local variables when keeping the object name provides useful context.

Preserve semantic context.

## Optional chaining and nullish coalescing

Use optional chaining for genuinely optional paths.

Do not use it to hide unexpected missing values.

Use `??` when only `null` and `undefined` should trigger the fallback.

Do not use `||` as a fallback when valid values such as `0`, `false`, or an empty string must be preserved.

## Imports

Keep imports clear and predictable.

Prefer direct imports from the module that owns the symbol.

Avoid deep imports into another module's internal implementation unless that path is intentionally public.

Avoid circular dependencies.

Keep import paths consistent with the project structure.

Do not reorganize imports manually when the project's formatter or linter already owns that behavior.

Separate import groups visually when the project convention supports it.

For example, external dependencies, internal modules, and local relative imports may form separate groups when that improves scanning.

Do not add meaningless empty lines between individual imports.

## Barrel files

Use barrel files deliberately.

They are appropriate when they define a clear public API for a module.

Do not create `index.ts` files everywhere automatically.

Avoid barrels that:

- hide ownership;
- create circular dependencies;
- export internal implementation details;
- make symbol origins difficult to identify.

A barrel should represent a boundary, not merely reduce import path length.

## Constants

Use named constants when a value has domain meaning or is reused.

Do not extract every literal into a constant.

Keep constants close to their usage unless they are genuinely shared.

Use uppercase constant naming only when it matches the project's conventions and the value represents a true constant.

Do not create a global constants file as a dumping ground.

## Utilities

Utilities should be small, focused, and genuinely reusable.

Do not move domain behavior into generic utility files.

If a helper belongs to one feature, keep it inside that feature.

A utility should normally have a clear technical responsibility and minimal domain knowledge.

Avoid large `utils.ts` files containing unrelated functions.

Split utilities by responsibility when necessary.

## Services

A service should represent a meaningful application, domain, or infrastructure responsibility.

Do not turn service files into collections of unrelated operations.

Keep service boundaries coherent.

A service may coordinate several dependencies when coordination is its responsibility.

Do not split a cohesive service into many tiny services merely to satisfy a pattern.

If a service approaches several hundred lines, review whether orchestration, transformation, persistence, external integrations, or validation have been mixed together.

Do not let service files grow beyond 1000 lines in normal application code.

## Interfaces between layers

Do not leak transport-specific or persistence-specific types into unrelated layers without a reason.

Keep external API models, persistence models, and internal domain models separate when they represent different concerns.

Do not create duplicate mapping layers when the shapes are intentionally identical and there is no meaningful boundary to protect.

Mapping should exist because models differ or because the boundary matters, not because architecture diagrams usually contain mappers.

## Dependencies

Prefer platform and language capabilities when they solve the problem clearly.

Do not add a package for trivial functionality.

Use established libraries for complex areas where custom implementations are risky or wasteful.

Examples include:

- parsing complex standards;
- cryptography;
- schema validation;
- date and timezone edge cases;
- protocol implementations.

Evaluate dependency cost instead of following a blanket "no dependencies" rule.

## Formatting

Let the project's formatter own mechanical formatting.

Do not manually fight Prettier, ESLint, Biome, or another configured formatting tool.

Do not introduce formatting changes unrelated to the task.

Use the existing lint and formatting configuration as the source of truth for syntax-level style.

These rules should focus on engineering decisions, not duplicate automated formatter rules.

Formatter output is not the only readability requirement.

If the formatter permits logically unrelated statements or member groups to remain adjacent, preserve meaningful blank lines between them.

Do not intentionally remove semantic whitespace simply because a formatter does not require it.

## Comments and JSDoc

Follow the global rule that comments should be rare.

Do not add JSDoc to obvious functions merely to repeat their signature.

Use JSDoc when it provides information the type system cannot express clearly.

Examples include:

- behavior constraints;
- external protocol requirements;
- non-obvious side effects;
- compatibility notes;
- important usage expectations.

Do not document parameters and return values that are already obvious from names and types.

Prefer whitespace, naming, and structure over section comments inside functions and classes.

## Testing

Test observable behavior.

Keep tests readable and deterministic.

Use blank lines to separate setup, execution, and verification when useful.

Prefer:

```ts
const service = createService();
const command = createCommand();

const result = await service.execute(command);

expect(result.status).toBe('success');
```

over:

```ts
const service = createService();
const command = createCommand();
const result = await service.execute(command);
expect(result.status).toBe('success');
```

Do not add ceremonial comments such as:

```ts
// Arrange
// Act
// Assert
```

when whitespace already makes the phases obvious.

Do not create tests that simply reproduce the implementation.

Do not mock every collaborator.

Mock or fake external, expensive, nondeterministic, or difficult boundaries as appropriate.

Avoid coupling tests to private implementation details.

Test important boundaries and failure cases.

Do not add meaningless tests only to increase coverage.

Do not change production architecture solely for testing unless the design also improves.

## Before finishing

Before completing a TypeScript change, check that:

- source files have not grown into oversized multi-responsibility files;
- normal application files approaching 1000 lines have been decomposed;
- functions and methods have visible logical structure;
- meaningful blank lines separate distinct stages;
- fields, constructors, accessors, and methods are grouped clearly;
- no unnecessary `any` was introduced;
- type assertions are justified;
- external data is validated where required;
- internal contracts rely on the type system instead of redundant runtime checks;
- types reflect real domain states;
- `null` and `undefined` are used consistently;
- async operations have deliberate sequencing or concurrency;
- no unnecessary classes or generic abstractions were added;
- files still have clear responsibilities;
- utilities have not become dumping grounds;
- services have not become oversized orchestration containers;
- module boundaries remain explicit;
- imports do not introduce circular dependencies;
- no type-level cleverness makes the code harder to understand.

## Directory structure

Organize code by domain, feature, or responsibility first and by file role second.

Do not allow a feature directory to become a large flat list of unrelated files.

A directory should represent one coherent concept or responsibility.

When a directory contains several distinct concepts, split them into subdirectories.

For example, avoid structures like:

```text
analysis/
  analyzer.service.ts
  analyzer.types.ts
  declaration.mapper.ts
  diagnostics.service.ts
  domain.types.ts
  domain.util.ts
  expression-evaluator.service.ts
  flow.interfaces.ts
  member.util.ts
  narrowing.util.ts
  program.factory.ts
  program.interfaces.ts
  range-checker.service.ts
  state.util.ts
  syntax.util.ts
  type-resolver.service.ts
  type-resolver.types.ts
```

Prefer grouping related files by concept:

```text
analysis/
  analyzer/
    analyzer.service.ts
    analyzer.types.ts

  diagnostics/
    diagnostics.service.ts

  domain/
    domain.types.ts
    domain.util.ts
    member.util.ts
    state.util.ts

  evaluator/
    expression-evaluator.service.ts

  flow/
    flow.interfaces.ts

  narrowing/
    narrowing.util.ts

  program/
    program.factory.ts
    program.interfaces.ts

  range/
    range-checker.service.ts

  syntax/
    declaration.mapper.ts
    syntax.util.ts

  type-resolver/
    type-resolver.service.ts
    type-resolver.types.ts
```

The exact grouping depends on actual ownership and dependencies. Do not move files together merely because their names look similar.

### Prefer vertical grouping

Keep the files that implement one concept close to each other.

For example:

```text
user/
  user.service.ts
  user.types.ts
  user.interfaces.ts
  user.mapper.ts
```

is usually preferable to:

```text
services/
  user.service.ts

types/
  user.types.ts

interfaces/
  user.interfaces.ts

mappers/
  user.mapper.ts
```

unless those directories represent meaningful architectural boundaries.

A developer working on one concept should not need to navigate several distant directories for its service, types, interfaces, utilities, and mappers.

### Detect flat-directory growth

Review the structure when a directory:

- contains roughly 8-12 or more source files;
- contains several unrelated filename prefixes;
- contains multiple services for different responsibilities;
- contains many unrelated `*.util.ts` files;
- requires scanning the entire directory to find the files for one concept;
- mixes domain logic, parsing, mapping, state, infrastructure, and orchestration at the same level.

These are signals, not mechanical limits.

Do not wait until a directory contains dozens of files before introducing meaningful subdirectories.

### Keep related files together

Files with the same conceptual owner should normally live together.

For example:

```text
type-resolver/
  type-resolver.service.ts
  type-resolver.types.ts
```

rather than placing both in a large flat parent directory.

The same applies to:

```text
program/
  program.factory.ts
  program.interfaces.ts
```

and similar groups.

### Utilities belong to their owner

Do not accumulate many unrelated utility files in the root of a feature.

Prefer:

```text
domain/
  domain.util.ts
  member.util.ts
```

when those utilities belong to the domain concept.

A utility should live as close as possible to the code that owns its semantics.

Move a utility to a broader shared location only when it is genuinely used across independent concepts.

Do not create generic `utils/`, `helpers/`, or `common/` directories as dumping grounds.

### Subdirectories must have meaning

Do not create a subdirectory for every individual file.

A directory should represent a stable conceptual boundary.

A one-file directory is acceptable when the concept itself is meaningful and is expected to own more implementation, or when the directory establishes an important architectural boundary.

Do not create artificial nesting merely to make the tree look organized.

### Directory depth

Prefer a small number of meaningful nesting levels.

For example:

```text
analysis/
  type-resolver/
    type-resolver.service.ts
    type-resolver.types.ts
```

is clear.

Avoid unnecessary structures such as:

```text
analysis/
  services/
    resolution/
      types/
        internal/
          type-resolver.service.ts
```

unless those levels correspond to real architectural boundaries.

### Feature roots

The root of a feature or module should remain easy to scan.

Prefer keeping only:

- major submodules;
- public entry points;
- module-level configuration;
- a small number of genuinely top-level files.

Do not use the feature root as the default location for every new file.

Before creating a new file, first determine which existing concept owns it.

If no concept owns it, consider whether a new submodule should be created.

### Index files

Use `index.ts` only when it defines a meaningful public boundary.

Do not add `index.ts` to every directory automatically.

An index file should expose the intended public API of a module, not blindly re-export every internal file.

Internal implementation files should remain internal.

### Refactoring existing structure

When working in a directory that has already become flat and difficult to navigate, improve the structure when doing so is reasonably related to the task.

Do not continue adding unrelated files to an already overloaded directory.

Move a coherent group together rather than relocating individual files randomly.

Preserve module boundaries and update imports consistently.

Do not perform a large unrelated repository-wide restructuring during a focused task, but do not use scope control as an excuse to make an obviously bad structure worse.
