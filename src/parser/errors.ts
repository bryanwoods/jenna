import { Token, SourceLocation } from '../lexer/token.js';

/**
 * Parse error with location information
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public location: SourceLocation
  ) {
    super(message);
    this.name = 'ParseError';
  }

  toString(): string {
    return `${this.name} at line ${this.location.line}, column ${this.location.column}: ${this.message}`;
  }
}

/**
 * Create a parse error from a token
 */
export function parseError(message: string, token: Token): ParseError {
  return new ParseError(message, token.location);
}

/**
 * Create an unexpected token error
 */
export function unexpectedToken(expected: string, found: Token): ParseError {
  return parseError(
    `Expected ${expected}, but found '${found.value}' (${found.type})`,
    found
  );
}
