# Jenna Programming Language - Implementation Plan

## Vision
A statically-typed functional language with type inference that compiles to JavaScript. Combines Ruby-like expressiveness with ML-family type safety, featuring **Algebraic Data Types and Pattern Matching** as its core differentiating feature from JavaScript/TypeScript.

## Phase 1: Core Language ✅ COMPLETED

### Goals
Build a working compiler that can:
- ✅ Parse and type-check functional programs
- ✅ Infer types automatically (Hindley-Milner)
- ✅ Generate clean JavaScript output
- ✅ Run programs with recursive functions

### Completed Features

**Syntax:**
- ✅ Let bindings: `let x = 5`
- ✅ Functions: `let add = (a, b) -> a + b`
- ✅ Function application: `add(2, 3)`
- ✅ Primitives: Int, Float, String, Bool
- ✅ Basic operators: `+`, `-`, `*`, `/`, `==`, `<`, `>`, `&&`, `||`, `!`
- ✅ If expressions: `if condition then expr1 else expr2`
- ✅ Type annotations (optional): `let x: Int = 5`
- ✅ Comments: `# This is a comment`

**Examples Working:**
- ✅ Hello World (`examples/hello.jn`)
- ✅ Factorial with recursion (`examples/factorial.jn`)
- ✅ Higher-order functions (`examples/higher-order.jn`)

## Phase 2: ADTs & Pattern Matching ✅ COMPLETED

### Implemented Features

**Algebraic Data Types:**
- ✅ Type declarations: `type Option a = Some a | None`
- ✅ Polymorphic types with type parameters
- ✅ Constructor expressions: `Some(42)`, `None`
- ✅ Tagged union compilation to JavaScript

**Pattern Matching:**
- ✅ Match expressions: `match opt with | Some(x) -> x | None -> 0 end`
- ✅ Literal patterns
- ✅ Identifier patterns (binding)
- ✅ Constructor patterns with destructuring
- ✅ Wildcard patterns: `_`
- ✅ Nested patterns: `Some(Ok(value))`

**Type System Enhancements:**
- ✅ ADT type representation
- ✅ Constructor registry for type checking
- ✅ Pattern type inference
- ✅ Type variable instantiation (fresh type vars per use)
- ✅ Polymorphic constructor types

**Working Examples:**
- ✅ Option type for safe null handling (`examples/option.jn`)
- ✅ Result type for error handling (`examples/result.jn`)
- ✅ Nested patterns (`examples/nested-patterns.jn`)
- ✅ List operations (map, filter, fold) (`examples/list-processing.jn`)
- ✅ FizzBuzz with ADTs (`examples/fizzbuzz.jn`)
- ✅ Comprehensive demo (`examples/demo.jn`)

### Key Bug Fixes
- ✅ Fixed type variable scoping - constructors now instantiate fresh type variables on each use
- ✅ Polymorphic types work correctly across multiple declarations

## Phase 3: Parser Improvements & Stdlib (CURRENT PHASE)

### Priority 1: Critical Parser Bugs ✅ COMPLETED

All 3 critical parser bugs have been fixed!

**Bug 1: Greedy Type Application ✅**
- **Problem**: `Branch Tree Tree` is parsed as `Branch (Tree Tree)` instead of two separate arguments
- **Solution**: Added check to stop consuming type arguments at uppercase identifiers
- **File**: `src/parser/parser.ts:189-205` - `simpleType()` method
- **Result**: Recursive ADTs now work! See `examples/binary-tree.jn`

**Bug 2: Multi-line Type Declarations ✅**
- **Problem**: Cannot put pipe on new line in type declarations
- **Solution**: Allow optional leading pipe after `=` token
- **File**: `src/parser/parser.ts:646` - `typeDeclaration()` method
- **Result**: Beautiful multi-line syntax! See `examples/multiline-types.jn`

**Bug 3: Let-Expressions ✅**
- **Problem**: Cannot use `let` bindings inside match branches or other expressions
- **Solution**: Added `LetExpr` AST node, parser, type inference, and codegen
- **Files**:
  - `src/parser/ast.ts:80-85`
  - `src/parser/parser.ts:593-609`
  - `src/types/infer.ts:272-284`
  - `src/codegen/codegen.ts:177-183`
- **Result**: `let x = value in body` works everywhere! See `examples/let-expressions.jn`

### Priority 2: Pattern Matching Improvements ✅ COMPLETED

**Exhaustiveness Checking ✅**
- **Status**: Implemented!
- **What it does**: Warns when pattern matching doesn't cover all cases
- **Example**: Warns if Option match only handles Some but not None
- **Files**:
  - `src/types/infer.ts:35-54` - Warning system
  - `src/types/infer.ts:448-519` - Exhaustiveness checking implementation
- **Test**: `examples/exhaustiveness-test.jn` - 8 comprehensive tests

### Priority 3: Stdlib Enhancements

**Missing Operations:**
- ❌ Integer division / modulo operator
- ❌ Int to String conversion
- ❌ String to Int parsing
- ❌ Math functions (abs, min, max, pow)
- ❌ List constructors and utilities
- ❌ print() overloads for Int, Bool, etc.

**Current Workarounds:**
- FizzBuzz uses recursive `isMultiple` instead of modulo
- Can only print strings, not numbers
- No way to convert between types

**Files to modify:**
- `src/stdlib/runtime.ts` - Add runtime functions
- `src/types/infer.ts` - Add stdlib type signatures

### Priority 4: Better Error Messages

**Current Issues:**
- Type errors are cryptic: "cannot unify t5 with Int"
- No source location in some errors
- Parser errors don't show context

**Improvements Needed:**
- Show user-friendly type names
- Highlight exact source location
- Suggest fixes for common errors
- Better error recovery in parser

## Phase 4: Advanced Features (FUTURE)

### Option A: Pipe Operator
- Syntax: `list |> map(double) |> filter(even) |> sum`
- Makes functional code more readable
- Relatively easy to implement (syntax sugar)

### Option B: Metaprogramming (THE BIG GOAL)
- Compile-time code generation
- Hygienic macros
- Type-safe DSL building
- This is what sets Jenna apart

### Option C: Module System ⭐ CRITICAL FOR SELF-HOSTING
- Import/export declarations
- Namespace management
- Separate compilation
- **Required before self-hosting attempt**

### Option D: JavaScript Interop ⭐ CRITICAL FOR SELF-HOSTING
- FFI for calling JS functions
- Type declarations for JS libraries
- Export Jenna code as JS modules
- **Required for file I/O in self-hosted compiler**

## Phase 5: Self-Hosting (LONG-TERM GOAL)

**Vision:** Jenna compiler written in Jenna, compiling itself! 🎉

### Prerequisites (Must complete first)

From Phase 4:
- ✅ **Module System** (Option C) - CRITICAL BLOCKER
  - Currently 14 source files need to import each other
  - Without modules, would need massive single-file compiler
- ✅ **JavaScript FFI** (Option D) - CRITICAL FOR FILE I/O
  - Need to read source files from disk
  - Need to write compiled output
- ✅ **String Operations in Stdlib**
  - charAt, substring, indexOf, split, join, etc.
  - Lexer depends heavily on string manipulation
- ✅ **Collection Types**
  - HashMap/Dict for symbol tables and registries
  - Arrays with literals and indexing
- ✅ **Error Handling**
  - Result/Either types for graceful error propagation

### Timeline & Approach

**Estimated Timeline:** 6-12 months after Phase 4 completion

**Why Wait:**
- Module system is non-negotiable (can't manage 14 files without it)
- Attempting too early = unmaintainable monolithic code
- Better to build solid foundation first

**Porting Strategy:**
1. Port lexer module first (relatively simple, good learning experience)
2. Port parser module (moderate complexity, tests parser generators)
3. Port types module (most complex - Hindley-Milner type inference)
4. Port codegen module (straightforward code generation)
5. Port stdlib and CLI wrapper

**Bootstrap Process:**
```bash
# Stage 0: TypeScript compiler compiles Jenna compiler (current state)
tsc src/**/*.ts → dist/**/*.js

# Stage 1: JS-compiled Jenna compiles Jenna-written Jenna compiler
./dist/cli/index.js compile compiler.jn → compiler-stage1.js

# Stage 2: Self-compilation! Jenna compiler compiles itself
./compiler-stage1.js compile compiler.jn → compiler-stage2.js

# Stage 3: Verification - outputs should be identical
diff compiler-stage1.js compiler-stage2.js  # Should be empty!
```

### The Magical Milestone

When this command succeeds, we've achieved self-hosting:
```bash
jenna compile jenna.jn
```

### Design Considerations for Self-Hosting

As we build Phase 4 features, keep self-hosting in mind:
- Design module system to be simple and explicit
- Keep FFI boundary clean and minimal
- Ensure stdlib has all string operations the lexer needs
- Make compiler architecture as functional as possible (easier to port)
- Avoid JavaScript-specific idioms that don't translate well

### Resources Needed Before Attempt

**Compiler Size Estimate:** ~5,000-8,000 lines of Jenna code
- Lexer: ~500 lines
- Parser: ~1,500 lines
- Types: ~2,500 lines (most complex)
- Codegen: ~800 lines
- Stdlib bindings: ~500 lines
- CLI/orchestration: ~200 lines

**Stdlib Required:**
- String: charAt, substring, indexOf, split, trim, replace
- Collections: List, HashMap, Array
- I/O: readFile, writeFile (via FFI)
- Error handling: Result type with map/flatMap
- Math: Basic arithmetic (already have)

**Not Required:**
- Advanced optimizations
- Incremental compilation
- Parallel compilation
- Debugger integration

Self-hosting is achievable, but requires patience and the right foundation!

## Known Limitations

- No parametric polymorphism in variant arguments (workaround exists)
- Float division behavior affects modulo operations
- Limited stdlib
- No REPL
- No debugger integration
- No syntax highlighting yet

## Architecture Notes

**Files to know:**
- `src/lexer/lexer.ts` - Tokenization
- `src/parser/parser.ts` - Parsing (NEEDS WORK)
- `src/types/infer.ts` - Type inference (mostly solid)
- `src/codegen/codegen.ts` - JS generation (working well)
- `src/stdlib/runtime.ts` - Built-in functions (needs expansion)

**Key Design Decisions:**
- ADTs compiled as tagged unions with `__tag` property
- Match expressions compiled to nested ternaries
- Type variables instantiated fresh on each constructor use
- No currying (for simplicity)

---

**Phase 3 Parser Work Complete!** 🎉 Jenna now has recursive ADTs, multi-line type declarations, and let-expressions. Next up: stdlib expansion, exhaustiveness checking, and working toward the self-hosting goal!
