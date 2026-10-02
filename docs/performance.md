# Analysis performance

Run `npm run benchmark` from a checkout. It compiles the plugin, creates a temporary
project with 1200 TypeScript files, and measures seven generated workloads. Each
result is the median of 11 samples after three warmups. The output includes the
Node.js version and diagnostic count. Temporary files are removed after the run.

The measured entry point includes compiler configuration, imported source loading,
TypeScript program creation, type resolution, statement traversal, and diagnostics.
Compilation, fixture creation, and ESLint's own parsing are outside the timer.
For a CPU profile after compilation, run:

```sh
node --cpu-prof --import tsx scripts/benchmark.ts
```

## Workloads

| Scenario         | Source                                                         |
| ---------------- | -------------------------------------------------------------- |
| Small file       | One invalid Byte initializer in a large project                |
| Repeated aliases | 1200 assignments through a shared two-step alias               |
| Generic calls    | 800 calls using a default generic bound                        |
| Wide objects     | 12 object literals with 250 constrained properties each        |
| Union coverage   | 400 functions using a union of 100 numeric ranges              |
| Alias graph      | Ten levels of duplicated alias references, followed by 20 uses |
| Branch states    | 300 outer variables and a guard with 26 comparisons            |

## Paired measurements

The previous and optimized builds were measured alternately in one process on
Node.js 24.19.0, using the workloads above and the same TypeScript installation.
Each build received three warmups and 11 measured samples per scenario. Times
exclude compilation and fixture creation; they depend on hardware and warmup.

| Scenario         | Previous median, ms | Optimized median, ms | Speedup |
| ---------------- | ------------------- | -------------------- | ------- |
| Small file       | 5.79                | 1.20                 | 4.84x   |
| Repeated aliases | 22.68               | 12.81                | 1.77x   |
| Generic calls    | 11.78               | 9.42                 | 1.25x   |
| Wide objects     | 29.65               | 11.24                | 2.64x   |
| Union coverage   | 207.41              | 11.03                | 18.80x  |
| Alias graph      | 149.86              | 1.25                 | 119.79x |
| Branch states    | 63.59               | 26.12                | 2.43x   |

## Algorithms and cache boundaries

Compiler configuration parsing reads options without discovering all project
files. The TypeScript program still loads the current file and its imports.
Configuration and imported files are read again on every analysis.

Type resolutions are memoized by AST node and binding environment. Environments
are read-only and are shared when no type parameters need binding. Cache reuse
also checks the active binding environments and the remaining recursion depth.
Resolutions that report errors or truncate recursive types are evaluated again;
their diagnostics and partial shapes depend on the traversal context.

Coverage checks sort and merge overlapping target intervals once, then use binary
search. For m target intervals and n source intervals, preparation takes
O(m log m) and coverage or intersection queries take O(n log m). Formatting uses
the original intervals, preserving diagnostic text, member order, and gaps.

Object literal property locations are indexed once instead of scanning all
properties for each contract member. Condition narrowing makes one initial copy
of the input state and copies it again only where branches need separate states.
Numeric widening computes its bounds without intermediate mapped arrays.
Built-in bounds are parsed into a lookup map once.

Resolution, declaration, interval, and property caches belong to one analyzer
instance. They do not retain source files or results between lint passes.
