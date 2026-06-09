import { SourceLocation } from './lexer/token.js';

/**
 * An error that knows where in the source it occurred
 */
export interface LocatedError extends Error {
  location?: SourceLocation;
}

/**
 * Human-readable label for an error class
 */
function errorLabel(error: Error): string {
  switch (error.name) {
    case 'LexError': return 'Syntax error';
    case 'ParseError': return 'Parse error';
    case 'TypeError': return 'Type error';
    default: return 'Error';
  }
}

/**
 * How many characters to underline, starting at the error column.
 * Underlines the whole token at that position (identifier, number,
 * string literal, or operator), falling back to a single caret.
 */
function underlineLength(line: string, column: number): number {
  const rest = line.slice(column - 1);
  const match = rest.match(/^("[^"]*"|[A-Za-z_][A-Za-z0-9_]*|\d+(\.\d+)?|\|>|[=!<>]=|&&|\|\||->|[^\s])/);
  return match ? match[0].length : 1;
}

/**
 * Format an error as a diagnostic with a source snippet:
 *
 *   Type error: Type mismatch: cannot unify Int with String
 *     --> example.jn:3:14
 *      |
 *    3 | let x: Int = "hello"
 *      |              ^^^^^^^
 */
export function formatError(error: Error, source: string, filename?: string): string {
  const location = (error as LocatedError).location;
  const label = errorLabel(error);

  if (!location) {
    return `${label}: ${error.message}`;
  }

  const lines = source.split('\n');
  const lineText = lines[location.line - 1];
  const where = `${filename ?? '<input>'}:${location.line}:${location.column}`;

  let result = `${label}: ${error.message}\n  --> ${where}`;

  if (lineText !== undefined) {
    const lineNum = String(location.line);
    const gutter = ' '.repeat(lineNum.length);
    const padding = ' '.repeat(Math.max(0, location.column - 1));
    const carets = '^'.repeat(underlineLength(lineText, location.column));
    result += `\n ${gutter} |\n ${lineNum} | ${lineText}\n ${gutter} | ${padding}${carets}`;
  }

  return result;
}
