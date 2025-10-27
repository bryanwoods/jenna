import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/lexer/lexer.js';
import { TokenType } from '../src/lexer/token.js';

describe('Lexer', () => {
  it('should tokenize integers', () => {
    const tokens = tokenize('42');
    expect(tokens).toHaveLength(2); // INT + EOF
    expect(tokens[0].type).toBe(TokenType.INT);
    expect(tokens[0].value).toBe('42');
  });

  it('should tokenize floats', () => {
    const tokens = tokenize('3.14');
    expect(tokens).toHaveLength(2);
    expect(tokens[0].type).toBe(TokenType.FLOAT);
    expect(tokens[0].value).toBe('3.14');
  });

  it('should tokenize strings', () => {
    const tokens = tokenize('"hello world"');
    expect(tokens).toHaveLength(2);
    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].value).toBe('hello world');
  });

  it('should tokenize identifiers', () => {
    const tokens = tokenize('foo bar_baz');
    expect(tokens).toHaveLength(3);
    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[0].value).toBe('foo');
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].value).toBe('bar_baz');
  });

  it('should tokenize keywords', () => {
    const tokens = tokenize('let if then else true false');
    expect(tokens[0].type).toBe(TokenType.LET);
    expect(tokens[1].type).toBe(TokenType.IF);
    expect(tokens[2].type).toBe(TokenType.THEN);
    expect(tokens[3].type).toBe(TokenType.ELSE);
    expect(tokens[4].type).toBe(TokenType.TRUE);
    expect(tokens[5].type).toBe(TokenType.FALSE);
  });

  it('should tokenize operators', () => {
    const tokens = tokenize('+ - * / = == != < <= > >= && ||');
    expect(tokens[0].type).toBe(TokenType.PLUS);
    expect(tokens[1].type).toBe(TokenType.MINUS);
    expect(tokens[2].type).toBe(TokenType.STAR);
    expect(tokens[3].type).toBe(TokenType.SLASH);
    expect(tokens[4].type).toBe(TokenType.EQUAL);
    expect(tokens[5].type).toBe(TokenType.DOUBLE_EQUAL);
    expect(tokens[6].type).toBe(TokenType.NOT_EQUAL);
    expect(tokens[7].type).toBe(TokenType.LESS);
    expect(tokens[8].type).toBe(TokenType.LESS_EQUAL);
    expect(tokens[9].type).toBe(TokenType.GREATER);
    expect(tokens[10].type).toBe(TokenType.GREATER_EQUAL);
    expect(tokens[11].type).toBe(TokenType.AND);
    expect(tokens[12].type).toBe(TokenType.OR);
  });

  it('should tokenize arrow', () => {
    const tokens = tokenize('->');
    expect(tokens[0].type).toBe(TokenType.ARROW);
    expect(tokens[0].value).toBe('->');
  });

  it('should tokenize delimiters', () => {
    const tokens = tokenize('( ) , :');
    expect(tokens[0].type).toBe(TokenType.LPAREN);
    expect(tokens[1].type).toBe(TokenType.RPAREN);
    expect(tokens[2].type).toBe(TokenType.COMMA);
    expect(tokens[3].type).toBe(TokenType.COLON);
  });

  it('should skip comments', () => {
    const tokens = tokenize('42 # this is a comment\n84');
    expect(tokens).toHaveLength(3); // 42, 84, EOF
    expect(tokens[0].value).toBe('42');
    expect(tokens[1].value).toBe('84');
  });

  it('should tokenize a simple let binding', () => {
    const tokens = tokenize('let x = 5');
    expect(tokens[0].type).toBe(TokenType.LET);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].value).toBe('x');
    expect(tokens[2].type).toBe(TokenType.EQUAL);
    expect(tokens[3].type).toBe(TokenType.INT);
    expect(tokens[3].value).toBe('5');
  });

  it('should tokenize a function definition', () => {
    const tokens = tokenize('let add = (a, b) -> a + b');
    expect(tokens[0].type).toBe(TokenType.LET);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].value).toBe('add');
    expect(tokens[2].type).toBe(TokenType.EQUAL);
    expect(tokens[3].type).toBe(TokenType.LPAREN);
    expect(tokens[4].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[4].value).toBe('a');
    expect(tokens[5].type).toBe(TokenType.COMMA);
    expect(tokens[6].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[6].value).toBe('b');
    expect(tokens[7].type).toBe(TokenType.RPAREN);
    expect(tokens[8].type).toBe(TokenType.ARROW);
  });

  it('should handle escape sequences in strings', () => {
    const tokens = tokenize('"hello\\nworld"');
    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].value).toBe('hello\nworld');
  });

  it('should track source locations', () => {
    const tokens = tokenize('let x = 42');
    expect(tokens[0].location.line).toBe(1);
    expect(tokens[0].location.column).toBe(1);
    expect(tokens[3].location.column).toBe(9); // '42' starts at column 9
  });

  it('should throw on unterminated string', () => {
    expect(() => tokenize('"unterminated')).toThrow('Unterminated string');
  });

  it('should throw on unexpected character', () => {
    expect(() => tokenize('@')).toThrow('Unexpected character');
  });
});
