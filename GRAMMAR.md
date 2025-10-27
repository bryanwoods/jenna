# Jenna Grammar Specification

This document defines the formal grammar for Jenna using Extended Backus-Naur Form (EBNF).

## Lexical Grammar

```
# Comments
COMMENT ::= '#' [^\n]* '\n'

# Literals
INTEGER ::= [0-9]+
FLOAT ::= [0-9]+ '.' [0-9]+
STRING ::= '"' (CHAR | ESCAPE_SEQUENCE)* '"'
BOOLEAN ::= 'true' | 'false'

# Identifiers and Keywords
IDENTIFIER ::= [a-zA-Z_][a-zA-Z0-9_]*
KEYWORD ::= 'let' | 'if' | 'then' | 'else' | 'true' | 'false'

# Operators
BINARY_OP ::= '+' | '-' | '*' | '/' | '==' | '!=' | '<' | '<=' | '>' | '>=' | '&&' | '||'
UNARY_OP ::= '!' | '-'

# Delimiters
ARROW ::= '->'
LPAREN ::= '('
RPAREN ::= ')'
COMMA ::= ','
COLON ::= ':'
EQUAL ::= '='
```

## Syntactic Grammar

### Program Structure

```
Program ::= Declaration*
```

### Declarations

```
Declaration ::= LetDeclaration

LetDeclaration ::= 'let' IDENTIFIER TypeAnnotation? '=' Expression
```

### Type Annotations

```
TypeAnnotation ::= ':' Type

Type ::= PrimitiveType
       | FunctionType

PrimitiveType ::= 'Int' | 'Float' | 'String' | 'Bool'

FunctionType ::= '(' Type (',' Type)* ')' '->' Type
```

### Expressions

```
Expression ::= LiteralExpr
             | IdentifierExpr
             | IfExpr
             | FunctionExpr
             | CallExpr
             | BinaryExpr
             | UnaryExpr
             | '(' Expression ')'

LiteralExpr ::= INTEGER | FLOAT | STRING | BOOLEAN

IdentifierExpr ::= IDENTIFIER

IfExpr ::= 'if' Expression 'then' Expression 'else' Expression

FunctionExpr ::= '(' Parameters ')' '->' Expression

Parameters ::= IDENTIFIER (',' IDENTIFIER)*
             | ε

CallExpr ::= PrimaryExpr '(' Arguments ')'

Arguments ::= Expression (',' Expression)*
            | ε

BinaryExpr ::= Expression BINARY_OP Expression

UnaryExpr ::= UNARY_OP Expression

PrimaryExpr ::= LiteralExpr
              | IdentifierExpr
              | '(' Expression ')'
```

## Operator Precedence

From highest to lowest:

1. **Primary** - literals, identifiers, parentheses
2. **Call** - function application `f(x)`
3. **Unary** - `!`, `-` (negation)
4. **Multiplicative** - `*`, `/`
5. **Additive** - `+`, `-`
6. **Relational** - `<`, `<=`, `>`, `>=`
7. **Equality** - `==`, `!=`
8. **Logical AND** - `&&`
9. **Logical OR** - `||`

## Operator Associativity

- Binary operators are **left-associative**
- Function application is **left-associative**
- Function arrow `->` is **right-associative**

## Examples

### Simple Let Binding
```jenna
let x = 5
```

### Function Definition
```jenna
let add = (a, b) -> a + b
```

### Function with Type Annotations
```jenna
let add: (Int, Int) -> Int = (a, b) -> a + b
```

### If Expression
```jenna
let max = (a, b) -> if a > b then a else b
```

### Function Call
```jenna
let result = add(2, 3)
```

### Recursive Function
```jenna
let factorial = (n) ->
  if n == 0 then
    1
  else
    n * factorial(n - 1)
```

### Complex Expression
```jenna
let compute = (x, y) ->
  if x > 0 && y > 0 then
    x * y + 10
  else
    x + y
```

## Notes

1. **Whitespace**: Whitespace (spaces, tabs) is not significant except as token separators. Newlines are currently not significant.

2. **Comments**: Single-line comments start with `#` and continue to the end of the line.

3. **Expressions are values**: Everything is an expression, including `if-then-else`, which returns a value.

4. **No statements**: Jenna has no statements, only expressions and declarations.

5. **Type inference**: Type annotations are optional. The type system will infer types when not explicitly provided.

6. **Function syntax**: Functions use the `->` arrow syntax: `(params) -> body`

7. **No blocks yet**: In Phase 1, function bodies and if branches are single expressions. Multi-expression blocks will come later.

## Future Extensions

The following will be added in later phases:

- **Pattern matching**: `match expr with | pattern -> expr`
- **Algebraic data types**: `type Option a = Some a | None`
- **Records/Objects**: `{ x: 10, y: 20 }`
- **Lists**: `[1, 2, 3]`
- **Let expressions**: `let x = 5 in x + 1`
- **Module system**: `import`, `export`
- **Macros**: Compile-time metaprogramming (Phase 3)
