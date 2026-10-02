# Tests

The Jest suite is written in TypeScript. SWC transforms the tests to ESM for
execution; `tsc -p tsconfig.tests.json` checks their types separately. Tests lint
source through the published plugin and ESLint's flat configuration. They assert
accepted values, diagnostic kinds, messages, and locations rather than private
analyzer state.

```sh
npm test
npm test -- --runTestsByPath tests/analysis/control-flow.test.ts
npm test -- --testNamePattern='includes the lower bound'
npm test -- --watch
npm run test:typecheck
```

`npm test` builds the plugin and checks the test types before running Jest.
`npm run test:run` runs Jest against an already compiled checkout.
`test:typecheck` checks the tests against the compiled declarations in `lib/`;
run `npm run compile` first after a fresh checkout. In watch mode, changes to
`src/` need a separate `npm run compile:watch` process because the tests exercise
the compiled package.

| Directory            | Behavior                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `tests/ranges/`      | Inclusive bounds, built in aliases, arithmetic, unions, generic aliases, invalid declarations, and lexical scope |
| `tests/analysis/`    | Assignment tracking, guards, branch merging, loops, function contracts, objects, collections, and unknown values |
| `tests/integration/` | Package configuration, diagnostic messages and locations, imported contracts, and global declaration loading     |
| `tests/support/`     | Shared ESLint setup, indentation of source examples, and temporary consumer files                                |

Keep one behavior per test. Name the expected behavior rather than copying the
source into the title. Put the source example before the lint call and separate
the assertions with a blank line. For example:

```ts
it('narrows a number inside an inclusive bounds guard', async () => {
  const code = dedent(`
    function checkChannel(input: number) {
      if (input >= 0 && input <= 255) {
        const channel: Byte = input;
      }
    }
  `);

  const messages = await lintSource(code);

  expect(messages).toEqual([]);
});
```

Rejected examples assert the complete diagnostic list with `toMatchObject`, so
missing or duplicate errors fail the test. Assert message text and source
positions when those details are the behavior under test. Use `it.each` or
`describe.each` for variations of the same contract, such as the bounds of each
built in alias or consumer module-resolution modes.

Jest injects `describe`, `it`, `expect`, and lifecycle hooks into each test.
`tsconfig.tests.json` enables their global types through `@types/jest` and the
Node.js globals through `@types/node`. Keep these Jest types scoped to tests.
Import filesystem, path, and other module APIs from the corresponding Node.js
modules; global type declarations do not provide their runtime implementations.

Shared lint helpers return all ESLint messages, so parser failures and unexpected
rules cannot pass silently. Import tests write real declarations and a
`tsconfig.json` into a fresh temporary project for every scenario. Declaration
tests install the checkout into a temporary consumer using a package symlink.
