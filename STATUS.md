# Jenna Language - Current Status

**Last Updated:** 2025-10-27

## 🎉 What Works

Jenna is a **fully functional, statically-typed language** with Hindley-Milner type inference that compiles to JavaScript.

### Core Features
- ✅ **Type Inference** - Complete Hindley-Milner with polymorphism
- ✅ **Algebraic Data Types** - Sum types with type parameters
- ✅ **Pattern Matching** - Exhaustive matching with destructuring
- ✅ **Exhaustiveness Checking** - Warns when match expressions don't cover all cases
- ✅ **Let-Expressions** - Local bindings in any expression context
- ✅ **Recursive ADTs** - Binary trees, graphs, complex data structures
- ✅ **Higher-Order Functions** - First-class functions, composition
- ✅ **Recursion** - Tail-recursive functions work perfectly
- ✅ **Operators** - Arithmetic (+, -, *, /, %), comparison (==, !=, <, <=, >, >=), logical (&&, ||, !), pipe (|>)
- ✅ **Standard Library** - Essential functions (mod, intToString, printInt, printBool, print)
- ✅ **Clean JS Output** - Readable, debuggable JavaScript generation

### Example Programs That Work

**List Processing:**
```jenna
type List a = Cons a List a | Nil

let map = (lst, f) ->
  match lst with
  | Nil -> Nil
  | Cons(h, t) -> Cons(f(h), map(t, f))
  end
```

**Option Type:**
```jenna
type Option a = Some a | None

let unwrapOr = (opt, default) ->
  match opt with
  | Some(x) -> x
  | None -> default
  end
```

**Nested Patterns:**
```jenna
match maybeResult with
| Some(Ok(value)) -> value
| Some(Err(msg)) -> -1
| None -> 0
end
```

**Pipe Operator:**
```jenna
let double = (x) -> x * 2
let addFive = (x) -> x + 5

# Traditional: addFive(double(10))
# With pipe: 10 |> double |> addFive
let result = 10 |> double |> addFive  # evaluates to 25
```

See `examples/demo.jn` for a comprehensive showcase with 11 passing tests!

## 🔴 Known Issues

### Missing Type Checker Features

- ❌ **No redundancy checking** - Won't warn about unreachable patterns
- ❌ **Cryptic error messages** - Shows "t5" instead of readable type names

## 📁 Key Files

```
src/
├── lexer/
│   ├── lexer.ts          # Tokenization - SOLID
│   ├── token.ts          # Token types - SOLID
│   └── keywords.ts       # Keywords - SOLID
├── parser/
│   ├── parser.ts         # ✅ SOLID - all critical bugs fixed!
│   ├── ast.ts            # AST definitions - SOLID
│   └── errors.ts         # Error handling - OK
├── types/
│   ├── infer.ts          # Type inference - SOLID
│   ├── types.ts          # Type representation - SOLID
│   ├── unify.ts          # Unification - SOLID
│   └── environment.ts    # Type environment - SOLID
├── codegen/
│   └── codegen.ts        # JS generation - SOLID
├── stdlib/
│   └── runtime.ts        # ✅ EXPANDED - mod, intToString, printInt, printBool, print
└── cli/
    └── index.js          # CLI tool - SOLID

examples/
├── demo.jn                     # ✅ COMPREHENSIVE - 11 passing tests
├── binary-tree.jn              # ✅ NEW - 9 tests for recursive ADTs
├── multiline-types.jn          # ✅ NEW - 8 tests for multi-line syntax
├── let-expressions.jn          # ✅ NEW - 10 tests for let in expressions
├── exhaustiveness-test.jn      # ✅ NEW - 8 tests for pattern exhaustiveness warnings
├── stdlib-test.jn              # ✅ NEW - Tests for mod, intToString, printInt, printBool
├── modulo-operator-test.jn     # ✅ NEW - Tests for % operator
├── pipe-operator-test.jn       # ✅ NEW - Tests for |> operator
├── pipe-functional-example.jn  # ✅ NEW - Functional programming with |>
├── fizzbuzz.jn                 # ✅ CLEAN - Uses % operator!
├── list-processing.jn          # ✅ WORKS - map, filter, fold
├── option.jn                   # ✅ WORKS - safe null handling
├── result.jn                   # ✅ WORKS - error handling
└── nested-patterns.jn          # ✅ WORKS - Some(Ok(x))
```

## 🎯 Recommended Next Steps

### Option 1: Better Error Messages (Quality)
Show user-friendly type names instead of "t5".

**Why:** Makes language more approachable and debugging easier.

**Files:** `src/types/types.ts`, `src/types/unify.ts`

**Test:** Trigger a type error and verify message is readable

### Option 2: Write Tests (Quality)
Add comprehensive test suite for ADTs and pattern matching.

**Why:** Prevent regressions as we add features.

**Files:** `tests/` directory - add new test files

## 🐛 Recent Bug Fixes & Enhancements

**Pipe Operator (COMPLETED ✅ - Today)**
Added the `|>` pipe operator for functional programming:
- Lexer: Added PIPE_RIGHT token for `|>`
- Parser: Added pipeline parsing level (lowest precedence, left-associative)
- Type inference: `x |> f` requires `f: A -> B` where `x: A`, result type is `B`
- Codegen: Transforms `x |> f` into `f(x)` in JavaScript

**Example:** `10 |> double |> addFive` evaluates to `addFive(double(10))`

**Benefits:**
- Enables functional composition style like F#/Elixir
- Makes data transformation pipelines more readable
- Left-to-right data flow instead of nested function calls

**Modulo Operator (COMPLETED ✅ - Today)**
Added the `%` modulo operator as a first-class language feature:
- Lexer: Added PERCENT token
- Parser: Added `%` to multiplicative operators (same precedence as `*` and `/`)
- Type inference: Added `%` to arithmetic operators (Int, Int) -> Int
- Codegen: Direct JavaScript `%` emission

**Example:** `10 % 3` evaluates to `1`

**Stdlib Enhancement (COMPLETED ✅ - Today)**
Added essential standard library functions:
- **mod(a, b)** - Modulo operation for clean divisibility checks
- **intToString(n)** - Convert integers to strings
- **printInt(n)** - Print integers directly
- **printBool(b)** - Print booleans directly

**Impact:** FizzBuzz now uses the clean `x % n == 0` syntax instead of function calls or workarounds. The language feels natural for mathematical operations.

**Parser Bugs (FIXED ✅ - Earlier)**
All 3 critical parser bugs have been fixed!

**1. Greedy Type Application**
- **Problem:** `Branch Tree Tree` was parsed as `Branch (Tree Tree)`, blocking recursive ADTs
- **Root cause:** Parser consumed uppercase identifiers as type arguments instead of stopping
- **Fix:** Added check to stop consuming type arguments when encountering uppercase identifiers
- **Location:** `src/parser/parser.ts:189-205` - `simpleType()` method
- **Now works:** `type Tree = Leaf Int | Branch Tree Tree` ✅

**2. Multi-line Type Declarations**
- **Problem:** Couldn't put pipe on new line, forcing single-line ADT definitions
- **Root cause:** Parser required first variant immediately after `=`
- **Fix:** Added optional pipe consumption before first variant
- **Location:** `src/parser/parser.ts:646` - `typeDeclaration()` method
- **Now works:** Multi-line syntax with leading pipes ✅

**3. Let-Expressions**
- **Problem:** Couldn't use `let` bindings inside match branches or expressions
- **Root cause:** No let-expression AST node or parsing support
- **Fix:** Added `LetExpr` AST node, parser support, type inference, and codegen
- **Locations:**
  - AST: `src/parser/ast.ts:80-85`
  - Parser: `src/parser/parser.ts:593-609`
  - Type inference: `src/types/infer.ts:272-284`
  - Codegen: `src/codegen/codegen.ts:177-183`
- **Now works:** `let x = value in body` expressions everywhere ✅

**Type Variable Scoping (FIXED ✅ - Earlier)**
- **Problem:** Using `List Int` then `List (Option Int)` would fail with type unification errors
- **Root cause:** Constructor types were created once with shared type variables instead of fresh instantiation per use
- **Fix:** Modified `src/types/infer.ts` to store AST type annotations and instantiate fresh type variables for each constructor use

## 💡 Design Decisions

**ADT Representation:**
```javascript
// Jenna: Some(42)
// JavaScript: { __tag: "Some", _0: 42 }
```

**Pattern Matching Compilation:**
```javascript
// Jenna: match opt with | Some(x) -> x | None -> 0 end
// JavaScript: (() => {
//   const __match_abc = opt;
//   return (__match_abc.__tag === "Some" ? (() => {
//     const x = __match_abc._0;
//     return x;
//   })() : 0);
// })()
```

**Type Inference:**
- Algorithm W (Hindley-Milner)
- Fresh type variable instantiation on each use
- Unification with occurs check
- No let-polymorphism (for simplicity)

## 🚀 How to Test

```bash
# Compile and run examples
npm run jenna run examples/demo.jn
npm run jenna run examples/fizzbuzz.jn
npm run jenna run examples/list-processing.jn

# Compile to JavaScript
npm run jenna compile examples/demo.jn

# Build the compiler
npm run build

# Run tests (currently 80+ passing tests for Phase 1 features)
npm test
```

## 📚 Resources

- `PLAN.md` - Full implementation plan with phase breakdown
- `GRAMMAR.md` - Language grammar specification
- `README.md` - Usage instructions and examples
- `examples/` - Working example programs

---

**Pipe Operator Complete!** 🎉 Jenna now has the `|>` pipe operator for functional programming! Combined with the `%` modulo operator and expanded stdlib (`mod`, `intToString`, `printInt`, `printBool`), the language now supports modern functional programming patterns. Examples: `x |> double |> addFive` and `x % n == 0`. The next phase focuses on better error messages and comprehensive tests.
