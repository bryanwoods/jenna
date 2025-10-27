/**
 * Abstract Syntax Tree node types for Jenna
 */

export type ASTNode = Expression | Declaration;

// Expressions
export type Expression =
  | LiteralExpr
  | IdentifierExpr
  | BinaryExpr
  | UnaryExpr
  | IfExpr
  | FunctionExpr
  | CallExpr
  | MatchExpr
  | ConstructorExpr
  | LetExpr;

export interface LiteralExpr {
  kind: 'Literal';
  value: number | string | boolean;
  literalType: 'int' | 'float' | 'string' | 'boolean';
}

export interface IdentifierExpr {
  kind: 'Identifier';
  name: string;
}

export interface BinaryExpr {
  kind: 'Binary';
  operator: '+' | '-' | '*' | '/' | '%' | '==' | '!=' | '<' | '<=' | '>' | '>=' | '&&' | '||' | '|>';
  left: Expression;
  right: Expression;
}

export interface UnaryExpr {
  kind: 'Unary';
  operator: '!' | '-';
  operand: Expression;
}

export interface IfExpr {
  kind: 'If';
  condition: Expression;
  thenBranch: Expression;
  elseBranch: Expression;
}

export interface FunctionExpr {
  kind: 'Function';
  parameters: string[];
  body: Expression;
}

export interface CallExpr {
  kind: 'Call';
  callee: Expression;
  arguments: Expression[];
}

export interface MatchExpr {
  kind: 'Match';
  expr: Expression;
  cases: MatchCase[];
}

export interface MatchCase {
  pattern: Pattern;
  body: Expression;
}

export interface ConstructorExpr {
  kind: 'Constructor';
  name: string;
  arguments: Expression[];
}

export interface LetExpr {
  kind: 'LetExpr';
  name: string;
  value: Expression;
  body: Expression;
}

// Patterns
export type Pattern =
  | LiteralPattern
  | IdentifierPattern
  | ConstructorPattern
  | WildcardPattern;

export interface LiteralPattern {
  kind: 'LiteralPattern';
  value: number | string | boolean;
  literalType: 'int' | 'float' | 'string' | 'boolean';
}

export interface IdentifierPattern {
  kind: 'IdentifierPattern';
  name: string;
}

export interface ConstructorPattern {
  kind: 'ConstructorPattern';
  constructor: string;
  arguments: Pattern[];
}

export interface WildcardPattern {
  kind: 'WildcardPattern';
}

// Declarations
export type Declaration = LetDeclaration | TypeDeclaration;

export interface LetDeclaration {
  kind: 'Let';
  name: string;
  typeAnnotation?: TypeAnnotation;
  value: Expression;
}

export interface TypeDeclaration {
  kind: 'Type';
  name: string;
  typeParams: string[];
  variants: Variant[];
}

export interface Variant {
  name: string;
  arguments: TypeAnnotation[];
}

// Type annotations
export type TypeAnnotation =
  | PrimitiveType
  | FunctionType
  | TypeVar
  | CustomType;

export interface PrimitiveType {
  kind: 'PrimitiveType';
  name: 'Int' | 'Float' | 'String' | 'Bool';
}

export interface FunctionType {
  kind: 'FunctionType';
  parameters: TypeAnnotation[];
  returnType: TypeAnnotation;
}

export interface TypeVar {
  kind: 'TypeVar';
  name: string;
}

export interface CustomType {
  kind: 'CustomType';
  name: string;
  arguments: TypeAnnotation[];
}

// Program (top level)
export interface Program {
  declarations: Declaration[];
}
