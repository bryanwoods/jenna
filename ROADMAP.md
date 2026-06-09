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
- **v0.4 — JavaScript interop.** `external` declarations bind JS values —
  global expressions or named imports from npm packages and node builtins —
  under trusted, mandatory type annotations. Function externals are wrapped
  at the annotated arity so JS argument quirks can't cross the boundary.
  Externals are polymorphic, exportable from modules, and compile to real
  ESM imports.
- **v0.5 — Records.** Nominal record types with inferred literals,
  field access, and functional update (`{ p | x: 10 }`). Records compile
  to plain JavaScript objects, so externals can produce and consume them
  directly — the FFI's natural data carrier. Type annotations also gained
  concrete type arguments (`List Player`) and parenthesized grouping.

## Next

- **Record patterns** — destructure records in `match` and bindings.
- **Richer interop data** — JS arrays ↔ Jenna lists at the FFI boundary
  (objects are already covered by records).
- **Map and Set** in the standard library.
- **Strings as more than tokens** — char access, slicing, classification.
- **Tail-call optimization** (or loop lowering) — recursion currently
  compiles to JS recursion, which limits how much data idiomatic Jenna can
  process.
- **Pattern redundancy checking** — warn on unreachable match cases.
- **REPL imports** — load `std/` and local modules into a session.

## Later

- **`jenna fmt`, written in Jenna.** The first real tool built in the
  language: it reads files, walks the AST, and writes output — exercising
  interop, records, strings, and TCO at a tenth the size of a compiler.
  This is deliberate dogfooding: it will surface every ergonomic gap that
  matters before anything bigger is attempted.
- Source maps for debugging compiled output.
- Language server (LSP) for editor support.
- Compile-time metaprogramming: hygienic macros and type-safe DSL building —
  the long-term differentiating feature, deliberately sequenced after the
  fundamentals above.

## On self-hosting

Self-hosting is a graduation exam, not a goal. Preparing for it is
indistinguishable from making Jenna good — a compiler in Jenna needs
records, real strings, Map/Set, TCO, and file I/O, every one of which is
independently worth shipping (see *Next*). But attempting it too early has
a real cost: once the compiler is written in Jenna, every language change
means updating a large Jenna codebase and managing a bootstrap chain, which
slows iteration exactly when the language should be changing fastest.

There is also respectable precedent for never doing it: Elm and PureScript
are written in Haskell, and Gleam is deliberately written in Rust.
Self-hosting buys credibility and dogfooding, not user-facing value.

The plan, in order:

1. Ship the language features above on their own merits.
2. Dogfood with `jenna fmt` — the cheap version of the exam.
3. If that goes well, pilot one phase: a Jenna lexer, compiled by the
   TypeScript compiler and validated against it across the test suite.
4. Consider full self-hosting only at/after 1.0, once the language has
   stopped moving. The TypeScript compiler remains the reference
   implementation either way.

## Non-goals (for now)

- Compilation targets other than JavaScript.
- An effect system (revisit after interop proves out).
