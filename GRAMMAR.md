# Jenna Grammar

The grammar of Jenna in EBNF, matching the implementation in
`src/lexer` and `src/parser`.

## Lexical grammar

```ebnf
COMMENT     ::= '#' [^\n]*

INTEGER     ::= [0-9]+
FLOAT       ::= [0-9]+ '.' [0-9]+
STRING      ::= '"' (CHAR | ESCAPE)* '"'        (* escapes: \n \t \r \\ \" *)
BOOLEAN     ::= 'true' | 'false'

IDENTIFIER  ::= [a-zA-Z_][a-zA-Z0-9_]*

KEYWORD     ::= 'let' | 'in' | 'if' | 'then' | 'else' | 'true' | 'false'
              | 'type' | 'match' | 'with' | 'end' | 'import' | 'export'
              | 'external'
```

`from` is a *contextual* keyword: it is only special inside an import
declaration and remains usable as an ordinary identifier.

Identifiers starting with an uppercase letter name types and constructors;
lowercase identifiers name values and type variables.

## Declarations

```ebnf
program      ::= declaration*

declaration  ::= import_decl
               | 'export'? let_decl
               | 'export'? type_decl
               | 'export'? external_decl

import_decl  ::= 'import' '{' import_names? '}' 'from' STRING
import_names ::= IDENTIFIER (',' IDENTIFIER)*

let_decl     ::= 'let' IDENTIFIER (':' type_annotation)? '=' expression

external_decl ::= 'external' IDENTIFIER ':' type_annotation '=' STRING
                  ('from' STRING)?

type_decl    ::= 'type' IDENTIFIER type_param* '=' '|'? variant ('|' variant)*
type_param   ::= IDENTIFIER                      (* lowercase *)
variant      ::= IDENTIFIER type_annotation*     (* uppercase name *)
```

Import paths starting with `./` or `../` resolve relative to the importing
file; bare paths such as `"std/list"` resolve into the bundled standard
library. The `.jn` extension may be omitted.

In an external declaration the string is a JavaScript expression; with a
`from` clause it instead names a member imported from that JavaScript
module. The type annotation is mandatory and trusted.

## Type annotations

```ebnf
type_annotation ::= function_type | simple_type

function_type   ::= '(' (type_annotation (',' type_annotation)*)? ')'
                    '->' type_annotation

simple_type     ::= 'Int' | 'Float' | 'String' | 'Bool'   (* primitives *)
                  | IDENTIFIER                            (* lowercase: type variable *)
                  | IDENTIFIER simple_type*               (* uppercase: ADT, e.g. Option a *)
```

## Expressions

Listed from lowest to highest precedence; all binary operators are
left-associative.

```ebnf
expression     ::= pipeline

pipeline       ::= logical_or ('|>' logical_or)*
logical_or     ::= logical_and ('||' logical_and)*
logical_and    ::= equality ('&&' equality)*
equality       ::= relational (('==' | '!=') relational)*
relational     ::= additive (('<' | '<=' | '>' | '>=') additive)*
additive       ::= multiplicative (('+' | '-') multiplicative)*
multiplicative ::= unary (('*' | '/' | '%') unary)*
unary          ::= ('!' | '-') unary | call
call           ::= primary ('(' arguments? ')')*
arguments      ::= expression (',' expression)*

primary        ::= INTEGER | FLOAT | STRING | BOOLEAN
                 | if_expr
                 | let_expr
                 | match_expr
                 | function_expr
                 | constructor_expr
                 | IDENTIFIER
                 | '(' expression ')'

if_expr        ::= 'if' expression 'then' expression 'else' expression

let_expr       ::= 'let' IDENTIFIER '=' expression 'in' expression

function_expr  ::= '(' (IDENTIFIER (',' IDENTIFIER)*)? ')' '->' expression

constructor_expr ::= IDENTIFIER ('(' arguments? ')')?   (* uppercase name *)

match_expr     ::= 'match' expression 'with'
                   '|'? match_case ('|' match_case)*
                   'end'
match_case     ::= pattern '->' expression
```

## Patterns

```ebnf
pattern             ::= literal_pattern
                      | '_'                                 (* wildcard *)
                      | IDENTIFIER                          (* lowercase: binding *)
                      | constructor_pattern

literal_pattern     ::= INTEGER | FLOAT | STRING | BOOLEAN

constructor_pattern ::= IDENTIFIER ('(' pattern (',' pattern)* ')')?
```

Patterns nest arbitrarily: `Some(Ok(value))` matches an `Option (Result a e)`.
Match expressions on ADTs are checked for exhaustiveness at compile time.
