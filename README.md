# TypeScript Between Type Plugin

An experimental TypeScript language service plugin for annotating numbers with
inclusive ranges. It explores how an editor could flag an out-of-range numeric
literal where TypeScript normally sees only `number`.

```ts
let channel: Between<1, 255> = 200; // Within the range
channel = 300;                       // The plugin aims to report an error
```

TypeScript has no built-in type for "a number between these two bounds". This
project adds editor diagnostics for some uses of `Between<Start, End>` without
changing JavaScript's numeric representation or TypeScript's compiler.

## Try it locally

This is a historical prototype built against TypeScript 3.4.5. The steps below
describe a local experiment, not a tested installation path for current
TypeScript releases.

1. Clone this repository, install its dependencies, and compile the plugin:

   ```sh
   npm install
   npm run compile
   ```

2. In a separate TypeScript project, install the compiled checkout as a local
   dependency, along with TypeScript 3.4.5:

   ```sh
   npm install --save-dev typescript@3.4.5 /path/to/typescript-between-type-plugin
   ```

3. Add the plugin and its global `Between` declaration to that project's
   `tsconfig.json`:

   ```json
   {
     "compilerOptions": {
       "plugins": [{ "name": "typescript-between-type-plugin" }],
       "types": ["typescript-between-type-plugin"]
     }
   }
   ```

   If the project already has a `types` list, add the package name to it
   instead of replacing the other entries.

4. Configure the editor to use the project's TypeScript installation. In VS
   Code, run **TypeScript: Select TypeScript Version** and choose **Use Workspace
   Version**. Restart the TypeScript server after changing the plugin or its
   configuration.

Try a direct annotation in a `.ts` file:

```ts
let opacity: Between<1, 100> = 50;
opacity = 120;
```

The bounds are inclusive. The implementation also accepts a direct union such
as `Between<1, 10> | Between<20, 30>`.

## Current scope and limitations

`Between<S, E>` is declared as an alias for `number`. The plugin inspects source
text and appends diagnostics to the editor's TypeScript language service.
Standard `tsc` does **not** load language service plugins, so `tsc` and CI will
not enforce these ranges. There is no runtime validation.

The prototype focuses on directly annotated variables and simple numeric
assignments. It does not reliably analyze arithmetic expressions, aliases of
`Between`, function arguments or return values. It also does not enforce that
a value is an integer: `Between<1, 255>` is not yet a `uint8` type. Zero is a
known edge case in the current diagnostics. Treat the examples as a way to
explore the plugin rather than a guarantee that every invalid value is caught.

## License

MIT. See [LICENSE](LICENSE). You may use, modify, and redistribute this code,
including commercially, as long as you keep the copyright and license notice.
