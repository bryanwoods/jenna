# Jenna

**A statically-typed functional language with full type inference that compiles to JavaScript.**

[![CI](https://github.com/bryanwoods/jenna/actions/workflows/ci.yml/badge.svg)](https://github.com/bryanwoods/jenna/actions/workflows/ci.yml)

```jenna
import { map, range, sum } from "std/list"

type Shape = Circle Int | Rect Int Int

let area = (shape) ->
  match shape with
  | Circle(r) -> 3 * r * r
  | Rect(w, h) -> w * h
  end

# Everything below is fully type-inferred
let totalArea = range(1, 5)
  |> (radii) -> map(radii, (r) -> Circle(r))
  |> (shapes) -> map(shapes, area)
  |> sum
```

Jenna brings ML-family type safety to the JavaScript ecosystem with syntax
that stays out of your way:

- **Hindley-Milner type inference** — programs are fully type-checked with
  zero annotations. Let-polymorphism means `let id = (x) -> x` works at every
  type. Annotations are optional and verified.
- **Algebraic data types & pattern matching** — model your domain precisely,
  destructure it with nested patterns, and get compile-time warnings when a
  `match` misses a case.
- **Modules with real privacy** — `import`/`export` across files; anything
  not exported is invisible to importers. Cycles are detected and reported.
- **A standard library written in Jenna** — `std/list`, `std/option`,
  `std/result`, `std/string` ship with the compiler.
- **Friendly errors** — every diagnostic points at the offending source:

  ```
  Type error: In declaration of 'x': Type mismatch: cannot unify String with Int
    --> example.jn:2:14
     |
   2 | let x: Int = "hello"
     |              ^^^^^^^
  ```

- **Readable JavaScript output** — one bundled file per program, no runtime
  dependency beyond a few small helper functions.

## Quick start

```bash
git clone https://github.com/bryanwoods/jenna.git
cd jenna
npm install
npm run build

# Run a program
npm run jenna run examples/showcase.jn

# Compile to JavaScript
npm run jenna compile examples/factorial.jn out.js

# Or explore interactively
npm run jenna repl
```

## A taste of the language

### Functions and inference

```jenna
let add = (a, b) -> a + b          # (Int, Int) -> Int, inferred
let makeAdder = (x) -> (y) -> x + y
let add5 = makeAdder(5)

let factorial = (n) ->
  if n == 0 then 1 else n * factorial(n - 1)
```

### Algebraic data types and pattern matching

```jenna
type Tree a = Leaf | Node Tree a Tree a

let size = (tree) ->
  match tree with
  | Leaf -> 0
  | Node(left, right) -> 1 + size(left) + size(right)
  end
```

Patterns nest (`Some(Ok(value))`), bind variables, and include wildcards.
Non-exhaustive matches produce a compile-time warning naming the missing
constructors.

### Pipelines

```jenna
let result = 5 |> double |> intToString |> print
```

### Modules

```jenna
# geometry.jn
export type Shape = Circle Int | Rect Int Int
export let area = (shape) -> ...
let helper = 1                      # private

# main.jn
import { Shape, area } from "./geometry"
import { map, sum } from "std/list"
```

Importing a type brings its constructors with it. Bare paths like
`"std/list"` load the bundled standard library; relative paths load your
own files.

### Standard library

| Module       | Exports                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------- |
| `std/list`   | `List`, `map`, `filter`, `foldl`, `length`, `append`, `reverse`, `head`, `range`, `sum`, `any`, `all` |
| `std/option` | `Option`, `unwrapOr`, `mapOption`, `andThen`, `isSome`, `isNone`                          |
| `std/result` | `Result`, `mapResult`, `unwrapResult`, `isOk`, `isErr`, `okToOption`                      |
| `std/string` | `join`, `repeat`                                                                          |

Built-ins available everywhere: `print`, `printInt`, `printBool`,
`intToString`, `concat`, `stringLength`, `mod`.

The prelude is ordinary Jenna source — see [`lib/std/`](lib/std) — and
doubles as a reference for idiomatic code.

## Examples

| File | Shows |
| ---- | ----- |
| [`hello.jn`](examples/hello.jn) | the smallest program |
| [`factorial.jn`](examples/factorial.jn) | recursion and inference |
| [`fizzbuzz.jn`](examples/fizzbuzz.jn) | ADTs modeling control flow |
| [`higher-order.jn`](examples/higher-order.jn) | functions as values |
| [`binary-tree.jn`](examples/binary-tree.jn) | recursive data structures |
| [`calculator.jn`](examples/calculator.jn) | an expression interpreter with `Result` error handling |
| [`stdlib-tour.jn`](examples/stdlib-tour.jn) | the standard library |
| [`modules/`](examples/modules) | a multi-file program |
| [`showcase.jn`](examples/showcase.jn) | everything at once |

Run any of them with `npm run jenna run examples/<name>.jn`.

## How it works

```
source (.jn)
  → lexer        src/lexer       tokens with source locations
  → parser       src/parser      recursive descent → typed AST
  → resolver     src/modules     import graph, cycle detection
  → inference    src/types       Hindley-Milner with let-polymorphism
  → codegen      src/codegen     readable JavaScript, one bundle
```

ADT values compile to tagged objects (`{ __tag: "Some", _0: 42 }`), pattern
matches to conditional chains, and each module to its own scope so private
names never collide. Types exist only at compile time — there is no runtime
type checking and no runtime type overhead.

## Status

Jenna is a young language under active development. The core — inference,
ADTs, pattern matching, modules, the prelude — is complete and tested
(126 tests, every example runs in CI). JavaScript interop is next; see
[ROADMAP.md](ROADMAP.md).

## Development

```bash
npm run build        # compile the compiler (TypeScript)
npm test             # run the test suite
npm run test:watch   # tests in watch mode
npm run watch        # rebuild on change
```

The formal grammar lives in [GRAMMAR.md](GRAMMAR.md). Tests live in
[`tests/`](tests), organized by compiler phase.

Feedback and ideas are welcome — open an issue to discuss.

## License

[MIT](LICENSE)
