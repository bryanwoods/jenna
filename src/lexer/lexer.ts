import { Token, TokenType, SourceLocation } from './token.js';
import { getKeywordType } from './keywords.js';

/**
 * Lexer for Jenna source code
 */
export class Lexer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(source: string) {
    this.source = source;
  }

  /**
   * Get the current character
   */
  private current(): string {
    return this.source[this.position] || '\0';
  }

  /**
   * Peek at the next character
   */
  private peek(offset: number = 1): string {
    return this.source[this.position + offset] || '\0';
  }

  /**
   * Advance to the next character
   */
  private advance(): string {
    const char = this.current();
    this.position++;
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  /**
   * Get current source location
   */
  private location(): SourceLocation {
    return {
      line: this.line,
      column: this.column,
      index: this.position,
    };
  }

  /**
   * Create a token
   */
  private token(type: TokenType, value: string): Token {
    return {
      type,
      value,
      location: this.location(),
    };
  }

  /**
   * Skip whitespace (except newlines)
   */
  private skipWhitespace(): void {
    while (this.current() !== '\0') {
      const char = this.current();
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else if (char === '#') {
        // Skip comment until end of line
        while (this.current() !== '\n' && this.current() !== '\0') {
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  /**
   * Tokenize a number (int or float)
   */
  private number(): Token {
    const location = this.location();
    let value = '';
    let isFloat = false;

    while (this.isDigit(this.current())) {
      value += this.advance();
    }

    // Check for decimal point
    if (this.current() === '.' && this.isDigit(this.peek())) {
      isFloat = true;
      value += this.advance(); // consume '.'
      while (this.isDigit(this.current())) {
        value += this.advance();
      }
    }

    return {
      type: isFloat ? TokenType.FLOAT : TokenType.INT,
      value,
      location,
    };
  }

  /**
   * Tokenize a string literal
   */
  private string(): Token {
    const location = this.location();
    let value = '';

    this.advance(); // consume opening quote

    while (this.current() !== '"' && this.current() !== '\0') {
      if (this.current() === '\\') {
        this.advance();
        const escaped = this.current();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          default: value += escaped;
        }
        this.advance();
      } else {
        value += this.advance();
      }
    }

    if (this.current() === '\0') {
      throw new Error(`Unterminated string at line ${location.line}, column ${location.column}`);
    }

    this.advance(); // consume closing quote

    return {
      type: TokenType.STRING,
      value,
      location,
    };
  }

  /**
   * Tokenize an identifier or keyword
   */
  private identifier(): Token {
    const location = this.location();
    let value = '';

    while (this.isAlphaNumeric(this.current())) {
      value += this.advance();
    }

    // Check if it's a keyword
    const keywordType = getKeywordType(value);
    const type = keywordType || TokenType.IDENTIFIER;

    return {
      type,
      value,
      location,
    };
  }

  /**
   * Check if character is a digit
   */
  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  /**
   * Check if character is a letter
   */
  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') ||
           (char >= 'A' && char <= 'Z') ||
           char === '_';
  }

  /**
   * Check if character is alphanumeric
   */
  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  /**
   * Get the next token
   */
  public nextToken(): Token {
    this.skipWhitespace();

    const location = this.location();
    const char = this.current();

    // End of file
    if (char === '\0') {
      return this.token(TokenType.EOF, '');
    }

    // Newline
    if (char === '\n') {
      this.advance();
      return this.token(TokenType.NEWLINE, '\n');
    }

    // Numbers
    if (this.isDigit(char)) {
      return this.number();
    }

    // Strings
    if (char === '"') {
      return this.string();
    }

    // Identifiers and keywords
    if (this.isAlpha(char)) {
      return this.identifier();
    }

    // Two-character operators
    if (char === '-' && this.peek() === '>') {
      this.advance();
      this.advance();
      return { type: TokenType.ARROW, value: '->', location };
    }

    if (char === '=' && this.peek() === '=') {
      this.advance();
      this.advance();
      return { type: TokenType.DOUBLE_EQUAL, value: '==', location };
    }

    if (char === '!' && this.peek() === '=') {
      this.advance();
      this.advance();
      return { type: TokenType.NOT_EQUAL, value: '!=', location };
    }

    if (char === '<' && this.peek() === '=') {
      this.advance();
      this.advance();
      return { type: TokenType.LESS_EQUAL, value: '<=', location };
    }

    if (char === '>' && this.peek() === '=') {
      this.advance();
      this.advance();
      return { type: TokenType.GREATER_EQUAL, value: '>=', location };
    }

    if (char === '&' && this.peek() === '&') {
      this.advance();
      this.advance();
      return { type: TokenType.AND, value: '&&', location };
    }

    if (char === '|' && this.peek() === '|') {
      this.advance();
      this.advance();
      return { type: TokenType.OR, value: '||', location };
    }

    if (char === '|' && this.peek() === '>') {
      this.advance();
      this.advance();
      return { type: TokenType.PIPE_RIGHT, value: '|>', location };
    }

    // Single-character tokens
    const singleChar = this.advance();
    switch (singleChar) {
      case '+': return { type: TokenType.PLUS, value: '+', location };
      case '-': return { type: TokenType.MINUS, value: '-', location };
      case '*': return { type: TokenType.STAR, value: '*', location };
      case '/': return { type: TokenType.SLASH, value: '/', location };
      case '%': return { type: TokenType.PERCENT, value: '%', location };
      case '=': return { type: TokenType.EQUAL, value: '=', location };
      case '<': return { type: TokenType.LESS, value: '<', location };
      case '>': return { type: TokenType.GREATER, value: '>', location };
      case '!': return { type: TokenType.NOT, value: '!', location };
      case '(': return { type: TokenType.LPAREN, value: '(', location };
      case ')': return { type: TokenType.RPAREN, value: ')', location };
      case ',': return { type: TokenType.COMMA, value: ',', location };
      case ':': return { type: TokenType.COLON, value: ':', location };
      case '|': return { type: TokenType.PIPE, value: '|', location };
      default:
        throw new Error(`Unexpected character '${singleChar}' at line ${location.line}, column ${location.column}`);
    }
  }

  /**
   * Tokenize all tokens
   */
  public tokenizeAll(): Token[] {
    const tokens: Token[] = [];
    let token: Token;

    do {
      token = this.nextToken();
      // Skip newlines for now (we might want them later for significant whitespace)
      if (token.type !== TokenType.NEWLINE) {
        tokens.push(token);
      }
    } while (token.type !== TokenType.EOF);

    return tokens;
  }
}

/**
 * Convenience function to tokenize source code
 */
export function tokenize(source: string): Token[] {
  const lexer = new Lexer(source);
  return lexer.tokenizeAll();
}
