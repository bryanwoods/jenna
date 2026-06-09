/**
 * Abstract Syntax Tree node types for Jenna
 */

import { SourceLocation } from '../lexer/token.js';

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
  | LetExpr
  | RecordLiteralExpr
  | FieldAccessExpr
  | RecordUpdateExpr;

export interface RecordLiteralExpr {
  kind: 'RecordLiteral';
  location?: SourceLocation;
  fields: Array<{ name: string; value: Expression }>;
}

export interface FieldAccessExpr {
  kind: 'FieldAccess';
  location?: SourceLocation;
  object: Expression;
  field: string;
}

export interface RecordUpdateExpr {
  kind: 'RecordUpdate';
  location?: SourceLocation;
  record: Expression;
  fields: Array<{ name: string; value: Expression }>;
}

export interface LiteralExpr {
  kind: 'Literal';
  location?: SourceLocation;
  value: number | string | boolean;
  literalType: 'int' | 'float' | 'string' | 'boolean';
}

export interface IdentifierExpr {
  kind: 'Identifier';
  location?: SourceLocation;
  name: string;
}

export interface BinaryExpr {
  kind: 'Binary';
  location?: SourceLocation;
  operator: '+' | '-' | '*' | '/' | '%' | '**' | '==' | '!=' | '<' | '<=' | '>' | '>=' | '&&' | '||' | '|>';
  left: Expression;
  right: Expression;
  /** Set by inference when arithmetic is Float-typed; '/' and '**' codegen depend on it */
  floatArith?: boolean;
}

export interface UnaryExpr {
  kind: 'Unary';
  location?: SourceLocation;
  operator: '!' | '-';
  operand: Expression;
}

export interface IfExpr {
  kind: 'If';
  location?: SourceLocation;
  condition: Expression;
  thenBranch: Expression;
  elseBranch: Expression;
}

export interface FunctionExpr {
  kind: 'Function';
  location?: SourceLocation;
  parameters: string[];
  body: Expression;
}

export interface CallExpr {
  kind: 'Call';
  location?: SourceLocation;
  callee: Expression;
  arguments: Expression[];
}

export interface MatchExpr {
  kind: 'Match';
  location?: SourceLocation;
  expr: Expression;
  cases: MatchCase[];
}

export interface MatchCase {
  pattern: Pattern;
  body: Expression;
}

export interface ConstructorExpr {
  kind: 'Constructor';
  location?: SourceLocation;
  name: string;
  arguments: Expression[];
}

export interface LetExpr {
  kind: 'LetExpr';
  location?: SourceLocation;
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
  location?: SourceLocation;
  constructor: string;
  arguments: Pattern[];
}

export interface WildcardPattern {
  kind: 'WildcardPattern';
}

// Declarations
export type Declaration =
  | LetDeclaration
  | TypeDeclaration
  | RecordDeclaration
  | ImportDeclaration
  | ExternalDeclaration;

/**
 * Nominal record type: type Point = { x: Int, y: Int }
 */
export interface RecordDeclaration {
  kind: 'Record';
  location?: SourceLocation;
  name: string;
  typeParams: string[];
  fields: RecordField[];
  exported?: boolean;
}

export interface RecordField {
  name: string;
  annotation: TypeAnnotation;
  location?: SourceLocation;
}

/**
 * Foreign (JavaScript) binding with a trusted type annotation.
 *
 * Without `fromModule`, jsValue is a JavaScript expression evaluated in
 * module scope ("Math.abs"). With `fromModule`, jsValue names a member
 * imported from that module ("readFileSync" from "node:fs").
 */
export interface ExternalDeclaration {
  kind: 'External';
  location?: SourceLocation;
  name: string;
  typeAnnotation: TypeAnnotation;
  jsValue: string;
  fromModule?: string;
  exported?: boolean;
}

export interface ImportedName {
  name: string;
  location?: SourceLocation;
}

export interface ImportDeclaration {
  kind: 'Import';
  location?: SourceLocation;
  names: ImportedName[];
  path: string;
}

export interface LetDeclaration {
  kind: 'Let';
  location?: SourceLocation;
  name: string;
  typeAnnotation?: TypeAnnotation;
  value: Expression;
  exported?: boolean;
}

export interface TypeDeclaration {
  kind: 'Type';
  location?: SourceLocation;
  name: string;
  typeParams: string[];
  variants: Variant[];
  exported?: boolean;
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
  location?: SourceLocation;
  name: string;
  arguments: TypeAnnotation[];
}

// Program (top level)
export interface Program {
  declarations: Declaration[];
}
