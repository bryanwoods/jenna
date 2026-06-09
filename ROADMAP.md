# Roadmap

Jenna's goal is to be a small, pleasant, *statically-typed* language for the
JavaScript ecosystem: ML-family type safety with approachable syntax. The
roadmap optimizes for making the language genuinely usable before adding
novel features.

## Shipped

- **v0.1 — Core language.** Lexer, recursive-descent parser, Hindley-Milner
  type inference, JavaScript code generation, CLI (`compile`, `run`).
- **v0.2 — Functional power.** Algebraic data types, pattern matching with
  exhaustiveness warnings, let expressions, the pipe operator (`|>`), an
  interactive REPL.
- **v0.3 — Programs, not snippets.**
  - Elm-style diagnostics: every compile error shows the offending source
    line with a caret, file, line, and column — across module boundaries.
  - Module system: `import { name } from "./path"`, `export` on
    declarations, real privacy, cycle detection, single-file JS output.
  - Let-polymorphism: generalized type schemes, instantiated per use site.
  - A standard library written in Jenna itself: `std/list`, `std/option`,
    `std/result`, `std/string`.

## Next

- **JavaScript interop** *(next up)*. Call into npm packages from Jenna with
  explicitly typed foreign declarations, keeping inference sound. This is
  the gate between "complete language" and "useful language", and needs a
  design pass first.
- **Map and Set** in the standard library.
- **Pattern redundancy checking** — warn on unreachable match cases.
- **REPL imports** — load `std/` and local modules into a session.

## Later

- Source maps for debugging compiled output.
- Language server (LSP) for editor support.
- Compile-time metaprogramming: hygienic macros and type-safe DSL building —
  the long-term differentiating feature, deliberately sequenced after the
  fundamentals above.

## Non-goals (for now)

- Self-hosting.
- Compilation targets other than JavaScript.
- An effect system (revisit after interop proves out).
