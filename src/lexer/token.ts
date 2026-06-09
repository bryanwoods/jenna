/**
 * Token types in Jenna
 */
export enum TokenType {
  // Literals
  INT = 'INT',
  FLOAT = 'FLOAT',
  STRING = 'STRING',
  TRUE = 'TRUE',
  FALSE = 'FALSE',

  // Identifiers and keywords
  IDENTIFIER = 'IDENTIFIER',
  LET = 'LET',
  IN = 'IN',
  IF = 'IF',
  THEN = 'THEN',
  ELSE = 'ELSE',
  TYPE = 'TYPE',
  MATCH = 'MATCH',
  WITH = 'WITH',
  END = 'END',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',

  // Operators
  PLUS = 'PLUS',           // +
  MINUS = 'MINUS',         // -
  STAR = 'STAR',           // *
  SLASH = 'SLASH',         // /
  PERCENT = 'PERCENT',     // %
  EQUAL = 'EQUAL',         // =
  DOUBLE_EQUAL = 'DOUBLE_EQUAL', // ==
  NOT_EQUAL = 'NOT_EQUAL', // !=
  LESS = 'LESS',           // <
  LESS_EQUAL = 'LESS_EQUAL', // <=
  GREATER = 'GREATER',     // >
  GREATER_EQUAL = 'GREATER_EQUAL', // >=
  AND = 'AND',             // &&
  OR = 'OR',               // ||
  NOT = 'NOT',             // !

  // Delimiters
  LPAREN = 'LPAREN',       // (
  RPAREN = 'RPAREN',       // )
  COMMA = 'COMMA',         // ,
  ARROW = 'ARROW',         // ->
  PIPE_RIGHT = 'PIPE_RIGHT', // |>
  COLON = 'COLON',         // :
  PIPE = 'PIPE',           // |
  LBRACE = 'LBRACE',       // {
  RBRACE = 'RBRACE',       // }

  // Special
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
}

/**
 * Source location for error reporting
 */
export interface SourceLocation {
  line: number;
  column: number;
  index: number;
}

/**
 * Token with type, value, and location
 */
export interface Token {
  type: TokenType;
  value: string;
  location: SourceLocation;
}
