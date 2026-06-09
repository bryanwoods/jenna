# Jenna

A statically-typed functional programming language with type inference that compiles to JavaScript.

## Vision

Jenna combines:
- **Ruby-like expressiveness** - Beautiful, readable syntax
- **ML-family type safety** - Hindley-Milner type inference
- **Compile-time metaprogramming** - Type-safe DSL building (coming in Phase 3)
- **JavaScript interop** - Seamless integration with the JS ecosystem

## Quick Example

```jenna
# Define an algebraic data type
type Option a = Some a | None

# Pattern matching with exhaustiveness checking
let unwrapOr = (opt, fallback) ->
  match opt with
  | Some(x) -> x
  | None -> fallback
  end

# Pipe operator for functional composition
let result = Some(10)
  |> (opt) -> unwrapOr(opt, 0)
  |> (x) -> x * 2
  |> intToString
  |> print  # Outputs: "20"
```

All types are inferred automatically - no type annotations needed!

## Features

✅ **Phase 1: Core Language (v0.1) - Complete**

- Full lexer with support for keywords, operators, literals, and comments
- Recursive descent parser generating a strongly-typed AST
- Hindley-Milner type inference with automatic inference, polymorphism, and recursion
- Clean JavaScript code generation
- CLI tool with `compile` and `run` commands
- 80+ passing tests covering all components

✅ **Phase 2: Functional Power (v0.2) - Complete**

- **Algebraic Data Types (ADTs)** - Sum types with type parameters and recursive definitions
- **Pattern Matching** - Exhaustive pattern matching with destructuring
- **Exhaustiveness Checking** - Compile-time warnings for non-exhaustive patterns
- **Let Expressions** - Local bindings in any expression context
- **Pipe Operator (`|>`)** - Functional composition and data transformation pipelines
- **Expanded Standard Library** - `mod`, `intToString`, `printInt`, `printBool`, `print`
- **Complete Operator Set** - Arithmetic (`+`, `-`, `*`, `/`, `%`), comparison, logical, pipe

## Installation

```bash
# Clone and install
cd jenna
npm install

# Build the compiler
npm run build

# Run tests
npm test
```

## Usage

### Running Jenna Programs

```bash
# Run a Jenna program directly
npm run jenna run examples/demo.jn

# Run other examples
npm run jenna run examples/fizzbuzz.jn
npm run jenna run examples/pipe-operator-test.jn

# Or use node directly
node dist/cli/index.js run examples/list-processing.jn
```

### Compiling to JavaScript

```bash
# Compile to JavaScript
npm run jenna compile examples/demo.jn

# Specify output file
npm run jenna compile examples/option.jn output.js

# View the generated JavaScript
npm run jenna compile examples/fizzbuzz.jn --output fizzbuzz.js
cat fizzbuzz.js
```

## Language Guide

### Variables and Let Bindings

```jenna
let x = 5
let message = "Hello, World!"
let flag = true
```

### Type Annotations (Optional)

```jenna
let x: Int = 42
let add: (Int, Int) -> Int = (a, b) -> a + b
```

### Functions

```jenna
# Simple function
let add = (a, b) -> a + b

# No parameters
let fortytwo = () -> 42

# Higher-order functions
let twice = (f, x) -> f(f(x))
```

### If Expressions

```jenna
let max = (a, b) ->
  if a > b then
    a
  else
    b
```

### Recursion

```jenna
let factorial = (n) ->
  if n == 0 then
    1
  else
    n * factorial(n - 1)
```

### Higher-Order Functions

```jenna
# Functions returning functions
let makeAdder = (x) -> (y) -> x + y
let add5 = makeAdder(5)
let result = add5(10)  # 15

# Functions taking functions
let twice = (f, x) -> f(f(x))
let addOne = (n) -> n + 1
let result = twice(addOne, 5)  # 7
```

### Algebraic Data Types

```jenna
# Simple enum
type TrafficLight = Red | Yellow | Green

# Type with parameters
type Option a = Some a | None

# Recursive types
type List a = Cons a (List a) | Nil

# Multiple type parameters
type Result a e = Ok a | Err e

# Using constructors
let myOption = Some(42)
let myList = Cons(1, Cons(2, Nil))
```

### Pattern Matching

```jenna
# Match on ADT constructors
let unwrap = (opt) ->
  match opt with
  | Some(x) -> x
  | None -> 0
  end

# Nested patterns
match result with
| Some(Ok(value)) -> value
| Some(Err(msg)) -> -1
| None -> 0
end

# Pattern matching with recursion
let length = (lst) ->
  match lst with
  | Nil -> 0
  | Cons(_, tail) -> 1 + length(tail)
  end
```

### Let Expressions

```jenna
# Local bindings in expressions
let result =
  let x = 10 in
  let y = 20 in
  x + y

# In match branches
match opt with
| Some(x) ->
    let doubled = x * 2 in
    doubled + 1
| None -> 0
end
```

### Modules

Split programs across files with `import` and `export`:

```jenna
# option.jn
export type Option a = Some a | None

export let unwrapOr = (opt, fallback) ->
  match opt with
  | Some(x) -> x
  | None -> fallback
  end

let helper = 1  # private: not visible to importers
```

```jenna
# main.jn
import { Option, unwrapOr } from "./option"

let value = unwrapOr(Some(42), 0)
```

- Paths are relative to the importing file; the `.jn` extension is optional
- Only `export`ed declarations can be imported — everything else is private
- Importing a type brings its constructors with it (`Option` gives you `Some` and `None`)
- Import cycles are detected and reported with the cycle chain
- The compiler bundles all modules into a single JavaScript file

### Pipe Operator

```jenna
# Traditional nested calls
let result = print(intToString(double(5)))

# With pipe operator (left-to-right flow)
let result = 5 |> double |> intToString |> print

# Complex pipelines
let square = (x) -> x * x
let isEven = (x) -> x % 2 == 0

let checkSquareEven = (n) ->
  n |> square |> isEven

# Chaining transformations
10 |> addFive |> double |> modulo10  # ((10 + 5) * 2) % 10
```

## Examples

See the `examples/` directory for complete programs:

**Core Features:**
- `demo.jn` - Comprehensive demonstration with 11 passing tests
- `binary-tree.jn` - Recursive ADTs (trees with 9 tests)
- `list-processing.jn` - Functional list operations (map, filter, fold)
- `option.jn` - Safe null handling with Option type
- `result.jn` - Error handling with Result type

**Language Features:**
- `multiline-types.jn` - Multi-line ADT syntax examples
- `let-expressions.jn` - Let expressions in various contexts
- `exhaustiveness-test.jn` - Pattern matching exhaustiveness warnings
- `nested-patterns.jn` - Complex nested pattern matching

**Operators & Stdlib:**
- `fizzbuzz.jn` - FizzBuzz using `%` operator and ADTs
- `modulo-operator-test.jn` - Modulo operator tests
- `pipe-operator-test.jn` - Pipe operator functionality tests
- `pipe-functional-example.jn` - Functional programming with pipelines
- `pipe-practical-example.jn` - Real-world pipeline examples
- `stdlib-test.jn` - Standard library function tests

## Project Structure

```
jenna/
├── src/
│   ├── lexer/          # Tokenization
│   │   ├── token.ts
│   │   ├── keywords.ts
│   │   └── lexer.ts
│   ├── parser/         # AST generation
│   │   ├── ast.ts
│   │   ├── parser.ts
│   │   └── errors.ts
│   ├── types/          # Type system & inference
│   │   ├── types.ts
│   │   ├── environment.ts
│   │   ├── unify.ts
│   │   └── infer.ts
│   ├── codegen/        # JavaScript generation
│   │   └── codegen.ts
│   ├── stdlib/         # Standard library
│   │   └── runtime.ts
│   ├── cli/            # Command-line interface
│   │   └── index.ts
│   └── index.ts        # Main compiler API
├── tests/              # Comprehensive test suite
├── examples/           # Example programs
├── GRAMMAR.md          # Formal grammar specification
├── PLAN.md             # Implementation roadmap
└── README.md
```

## Type System

Jenna uses Hindley-Milner type inference, which means:

- **Types are inferred automatically** - You don't need to write type annotations
- **Type annotations are checked** - If you do provide them, the compiler verifies them
- **Polymorphic types** - Functions can work with multiple types
- **No runtime type checking** - All type errors are caught at compile time

### Built-in Types

- `Int` - Integer numbers
- `Float` - Floating-point numbers
- `String` - Text strings
- `Bool` - Boolean values (true/false)
- Function types: `(T1, T2) -> T3`
- User-defined ADTs: `type Option a = Some a | None`

## Standard Library

### I/O Functions

- `print(s: String) -> String` - Print string to console and return it
- `printInt(n: Int) -> Int` - Print integer to console and return it
- `printBool(b: Bool) -> Bool` - Print boolean to console and return it

### Conversion Functions

- `intToString(n: Int) -> String` - Convert integer to string

### Math Functions

- `mod(a: Int, b: Int) -> Int` - Modulo operation (also available as `%` operator)

### Operators

- **Arithmetic**: `+`, `-`, `*`, `/`, `%` (modulo)
- **Comparison**: `==`, `!=`, `<`, `<=`, `>`, `>=`
- **Logical**: `&&`, `||`, `!`
- **Pipe**: `|>` (function application/composition)

## Development

```bash
# Watch mode for development
npm run watch

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Implementation Details

### Lexer

- Hand-written lexer with full Unicode support
- Comprehensive token types for all language constructs
- Source location tracking for error messages
- Comment support with `#`

### Parser

- Recursive descent parser with proper operator precedence
- Multi-level precedence hierarchy (pipeline → logical → comparison → arithmetic)
- Support for algebraic data types and pattern matching
- Look-ahead for disambiguating functions vs grouped expressions
- Multi-line type declarations with optional leading pipes
- Detailed error messages with source locations

### Type Inference

- Hindley-Milner algorithm (Algorithm W)
- Unification with occurs check (prevents infinite types)
- Type environment with lexical scoping
- Support for recursive definitions and recursive ADTs
- Polymorphic type parameters in ADTs
- Fresh type variable instantiation for constructor uses
- Pattern exhaustiveness checking with warnings

### Code Generation

- Clean, readable JavaScript output
- Arrow function syntax for functions
- Ternary operators for if expressions
- ADT constructors as tagged objects (`{__tag: "Some", _0: value}`)
- Pattern matching compiled to efficient if-else chains
- Pipe operator (`|>`) compiled to function calls
- Automatic runtime library inclusion

## Roadmap

### Phase 1: Core Language (v0.1) ✅ Complete

- [x] Lexer with full operator and keyword support
- [x] Recursive descent parser
- [x] Hindley-Milner type inference
- [x] JavaScript code generator
- [x] CLI tool (compile & run commands)
- [x] Comprehensive test suite (80+ tests)

### Phase 2: Functional Power (v0.2) ✅ Complete

- [x] Algebraic data types (sum types with type parameters)
- [x] Pattern matching with destructuring
- [x] Exhaustiveness checking for patterns
- [x] Let expressions (local bindings)
- [x] Recursive ADT support (trees, lists, etc.)
- [x] Pipe operator (`|>`) for functional composition
- [x] Expanded standard library
- [x] Modulo operator (`%`)

**Remaining for Phase 2:**
- [x] Better error messages with source snippets
- [x] Module system (import/export with privacy and cycle detection)
- [ ] Immutable data structures in stdlib (List, Map, Set)
- [ ] Redundancy checking for patterns

### Phase 3: The Unique Feature (v0.3) 🚧 Planned

- [ ] Compile-time metaprogramming
- [ ] Hygienic macros
- [ ] Type-safe DSL building
- [ ] Macro expansion visualization

### Phase 4: Production Ready (v0.4) 🚧 Planned

- [ ] JavaScript interop (call any npm package)
- [ ] Package manager
- [ ] Effect system (track side effects in types)
- [ ] Optimization passes
- [ ] Source maps
- [ ] Language server protocol

## Contributing

This is a learning project, but feedback and ideas are welcome! Please open an issue to discuss any changes.

## What Makes Jenna Unique?

Jenna currently features:

**✅ Complete ML-style functional programming:**
- Algebraic data types with type parameters
- Pattern matching with exhaustiveness checking
- Hindley-Milner type inference
- Pipe operator for functional composition
- Modern syntax inspired by Ruby and F#

**🚧 Planned unique features (Phase 3):**
- Compile-time metaprogramming with hygienic macros
- Type-safe DSL building at compile time
- Ruby-like metaprogramming power with ML-family type safety
- All errors caught before runtime

The goal: Rails-like DSL ergonomics with complete type safety!

## Learning Resources

This project demonstrates:

- **Lexical analysis** - Converting text to tokens with multi-character operators
- **Parsing** - Building abstract syntax trees with proper precedence
- **Type theory** - Hindley-Milner type inference with polymorphism
- **Algebraic data types** - Sum types and pattern matching compilation
- **Compiler design** - Multi-phase compilation pipeline
- **Code generation** - Emitting clean JavaScript from high-level constructs

Great for learning:
- Compiler construction fundamentals
- Type system implementation
- Functional programming language design
- Pattern matching compilation strategies

## License

MIT

## Acknowledgments

Inspired by:
- **Ruby** - Expressiveness and metaprogramming
- **OCaml/Haskell** - Type systems and inference
- **F#/Elixir** - Pipe operator and functional composition
- **Elm/Gleam** - Clean functional languages for practical use
- **Rust** - Algebraic data types and pattern matching
- **Lisp** - Powerful macro systems (for future Phase 3)

---

**Built with ❤️ as a learning project to explore compiler design, type theory, and language implementation.**
