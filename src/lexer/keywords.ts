import { TokenType } from './token.js';

/**
 * Reserved keywords in Jenna
 */
export const KEYWORDS: Map<string, TokenType> = new Map([
  ['let', TokenType.LET],
  ['in', TokenType.IN],
  ['if', TokenType.IF],
  ['then', TokenType.THEN],
  ['else', TokenType.ELSE],
  ['true', TokenType.TRUE],
  ['false', TokenType.FALSE],
  ['type', TokenType.TYPE],
  ['match', TokenType.MATCH],
  ['with', TokenType.WITH],
  ['end', TokenType.END],
  ['import', TokenType.IMPORT],
  ['export', TokenType.EXPORT],
  ['external', TokenType.EXTERNAL],
]);

/**
 * Check if an identifier is a keyword
 */
export function isKeyword(identifier: string): boolean {
  return KEYWORDS.has(identifier);
}

/**
 * Get the token type for a keyword
 */
export function getKeywordType(keyword: string): TokenType | undefined {
  return KEYWORDS.get(keyword);
}
