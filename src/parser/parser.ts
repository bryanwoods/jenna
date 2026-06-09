import { Token, TokenType } from '../lexer/token.js';
import {
  Program,
  Declaration,
  LetDeclaration,
  Variant,
  Expression,
  IfExpr,
  FunctionExpr,
  CallExpr,
  MatchExpr,
  MatchCase,
  Pattern,
  LiteralPattern,
  ConstructorPattern,
  TypeAnnotation,
} from './ast.js';
import { unexpectedToken } from './errors.js';

/**
 * Recursive descent parser for Jenna
 */
export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Get the current token
   */
  private peek(): Token {
    return this.tokens[this.current];
  }

  /**
   * Get the previous token
   */
  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  /**
   * Look ahead past the current token
   */
  private peekNext(): Token {
    return this.tokens[Math.min(this.current + 1, this.tokens.length - 1)];
  }

  /**
   * Check if we're at the end
   */
  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  /**
   * Advance to the next token
   */
  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  /**
   * Check if current token matches any of the given types
   */
  private check(...types: TokenType[]): boolean {
    if (this.isAtEnd()) return false;
    return types.includes(this.peek().type);
  }

  /**
   * Consume a token if it matches, otherwise throw error
   */
  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw unexpectedToken(message, this.peek());
  }

  /**
   * Match and consume if current token matches any of the given types
   */
  private match(...types: TokenType[]): boolean {
    if (this.check(...types)) {
      this.advance();
      return true;
    }
    return false;
  }

  /**
   * Parse a program (entry point)
   */
  public program(): Program {
    const declarations: Declaration[] = [];

    while (!this.isAtEnd()) {
      declarations.push(this.declaration());
    }

    return { declarations };
  }

  /**
   * Parse a declaration
   */
  private declaration(): Declaration {
    if (this.match(TokenType.IMPORT)) {
      return this.importDeclaration();
    }

    if (this.match(TokenType.EXPORT)) {
      if (this.match(TokenType.LET)) {
        return { ...this.letDeclaration(), exported: true };
      }
      if (this.match(TokenType.TYPE)) {
        return { ...this.typeDeclaration(), exported: true };
      }
      if (this.match(TokenType.EXTERNAL)) {
        return { ...this.externalDeclaration(), exported: true };
      }
      throw unexpectedToken("'let', 'type', or 'external' after 'export'", this.peek());
    }

    if (this.match(TokenType.LET)) {
      return this.letDeclaration();
    }

    if (this.match(TokenType.TYPE)) {
      return this.typeDeclaration();
    }

    if (this.match(TokenType.EXTERNAL)) {
      return this.externalDeclaration();
    }

    throw unexpectedToken('declaration', this.peek());
  }

  /**
   * Parse an external (JavaScript FFI) declaration
   * external abs: (Int) -> Int = "Math.abs"
   * external readFile: (String, String) -> String = "readFileSync" from "node:fs"
   */
  private externalDeclaration(): import('./ast.js').ExternalDeclaration {
    const location = this.previous().location;

    const nameToken = this.consume(TokenType.IDENTIFIER, 'external name');
    this.consume(TokenType.COLON, "':' (external declarations require a type annotation)");
    const typeAnnotation = this.typeAnnotation();
    this.consume(TokenType.EQUAL, '=');
    const valueToken = this.consume(TokenType.STRING, 'JavaScript expression string');

    // Optional: 'from' "module" (contextual keyword, like imports)
    let fromModule: string | undefined;
    if (this.check(TokenType.IDENTIFIER) && this.peek().value === 'from') {
      this.advance();
      const moduleToken = this.consume(TokenType.STRING, 'module path string');
      fromModule = moduleToken.value;
    }

    return {
      kind: 'External',
      name: nameToken.value,
      typeAnnotation,
      jsValue: valueToken.value,
      fromModule,
      location,
    };
  }

  /**
   * Parse an import declaration
   * import { add, Option } from "./math"
   */
  private importDeclaration(): import('./ast.js').ImportDeclaration {
    const location = this.previous().location;

    this.consume(TokenType.LBRACE, '{');

    const names: import('./ast.js').ImportedName[] = [];
    if (!this.check(TokenType.RBRACE)) {
      do {
        const nameToken = this.consume(TokenType.IDENTIFIER, 'imported name');
        names.push({ name: nameToken.value, location: nameToken.location });
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RBRACE, '}');

    // 'from' is a contextual keyword: expect an identifier spelled "from"
    const fromToken = this.consume(TokenType.IDENTIFIER, "'from'");
    if (fromToken.value !== 'from') {
      throw unexpectedToken("'from'", fromToken);
    }

    const pathToken = this.consume(TokenType.STRING, 'module path string');

    return {
      kind: 'Import',
      names,
      path: pathToken.value,
      location,
    };
  }

  /**
   * Parse a let declaration
   * let x = 5
   * let add = (a, b) -> a + b
   * let x: Int = 5
   */
  private letDeclaration(): LetDeclaration {
    const location = this.previous().location;
    const nameToken = this.consume(TokenType.IDENTIFIER, 'identifier');
    const name = nameToken.value;

    // Optional type annotation
    let typeAnnotation: TypeAnnotation | undefined;
    if (this.match(TokenType.COLON)) {
      typeAnnotation = this.typeAnnotation();
    }

    this.consume(TokenType.EQUAL, '=');
    const value = this.expression();

    return {
      kind: 'Let',
      name,
      typeAnnotation,
      value,
      location,
    };
  }

  /**
   * Parse a type annotation
   * Int, String, Option a, List Player, (Int, Int) -> Int
   *
   * greedy controls whether an uppercase identifier is consumed as a
   * type argument. Everywhere a type is delimited (annotations, record
   * fields, function types) we parse greedily, so 'List Player' means
   * List applied to Player. Inside ADT variants we don't, so
   * 'Branch Tree Tree' stays three separate argument types.
   */
  private typeAnnotation(greedy: boolean = true): TypeAnnotation {
    // Function type or parenthesized (grouped) type
    if (this.check(TokenType.LPAREN)) {
      return this.functionType();
    }

    // Type name or type variable
    return this.simpleType(greedy);
  }

  /**
   * Parse a simple type (primitive, type variable, or custom type)
   * Int, a, Option a, Result a e, List Player (greedy)
   */
  private simpleType(greedy: boolean): TypeAnnotation {
    const token = this.consume(TokenType.IDENTIFIER, 'type name');
    const name = token.value;

    // Check if it's a primitive type
    const primitiveTypes = ['Int', 'Float', 'String', 'Bool'];
    if (primitiveTypes.includes(name)) {
      return {
        kind: 'PrimitiveType',
        name: name as 'Int' | 'Float' | 'String' | 'Bool',
      };
    }

    // Check if it's a type variable (lowercase first letter)
    if (name[0] === name[0].toLowerCase()) {
      return {
        kind: 'TypeVar',
        name,
      };
    }

    // Otherwise, it's a custom type
    // Check for type arguments
    const typeArgs: TypeAnnotation[] = [];
    for (;;) {
      // Parenthesized argument: Option (List Int), Option ((Int) -> Int)
      if (greedy && this.check(TokenType.LPAREN)) {
        typeArgs.push(this.functionType());
        continue;
      }

      if (!this.check(TokenType.IDENTIFIER)) {
        break;
      }

      const nextToken = this.peek();
      if (nextToken.value === 'let' || nextToken.value === 'type') {
        break;
      }

      // Outside greedy contexts, stop at uppercase identifiers so ADT
      // variants parse 'Branch Tree Tree' as three separate types
      if (!greedy && nextToken.value[0] === nextToken.value[0].toUpperCase()) {
        break;
      }

      // Arguments themselves bind tightly (non-greedy): 'Pair Int String'
      // is Pair applied to Int and String
      typeArgs.push(this.simpleType(false));
    }

    return {
      kind: 'CustomType',
      name,
      arguments: typeArgs,
      location: token.location,
    };
  }

  /**
   * Parse a function type or a parenthesized type
   * (Int, Int) -> Int
   * (String) -> Bool
   * () -> Int
   * (List Int)            grouped type, no arrow
   */
  private functionType(): TypeAnnotation {
    this.consume(TokenType.LPAREN, '(');

    const parameters: TypeAnnotation[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        parameters.push(this.typeAnnotation());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RPAREN, ')');

    // No arrow: this was a parenthesized (grouped) type
    if (!this.check(TokenType.ARROW)) {
      if (parameters.length === 1) {
        return parameters[0];
      }
      throw unexpectedToken("'->' after function type parameters", this.peek());
    }

    this.consume(TokenType.ARROW, '->');
    const returnType = this.typeAnnotation();

    return {
      kind: 'FunctionType',
      parameters,
      returnType,
    };
  }

  /**
   * Parse an expression
   */
  private expression(): Expression {
    return this.pipeline();
  }

  /**
   * Parse pipeline (lowest precedence)
   * a |> b
   */
  private pipeline(): Expression {
    let expr = this.logicalOr();

    while (this.match(TokenType.PIPE_RIGHT)) {
      const operator = '|>';
      const location = this.previous().location;
      const right = this.logicalOr();
      expr = {
        kind: 'Binary',
        operator,
        location,
        left: expr,
        right,
      };
    }

    return expr;
  }

  /**
   * Parse logical OR
   * a || b
   */
  private logicalOr(): Expression {
    let expr = this.logicalAnd();

    while (this.match(TokenType.OR)) {
      const operator = '||';
      const location = this.previous().location;
      const right = this.logicalAnd();
      expr = {
        kind: 'Binary',
        operator,
        location,
        left: expr,
        right,
      };
    }

    return expr;
  }

  /**
   * Parse logical AND
   * a && b
   */
  private logicalAnd(): Expression {
    let expr = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = '&&';
      const location = this.previous().location;
      const right = this.equality();
      expr = {
        kind: 'Binary',
        operator,
        location,
        left: expr,
        right,
      };
    }

    return expr;
  }

  /**
   * Parse equality
   * a == b, a != b
   */
  private equality(): Expression {
    let expr = this.relational();

    while (this.match(TokenType.DOUBLE_EQUAL, TokenType.NOT_EQUAL)) {
      const operator = this.previous().value as '==' | '!=';
      const location = this.previous().location;
      const right = this.relational();
      expr = {
        kind: 'Binary',
        operator,
        location,
        left: expr,
        right,
      };
    }

    return expr;
  }

  /**
   * Parse relational
   * a < b, a <= b, a > b, a >= b
   */
  private relational(): Expression {
    let expr = this.additive();

    while (this.match(TokenType.LESS, TokenType.LESS_EQUAL, TokenType.GREATER, TokenType.GREATER_EQUAL)) {
      const operator = this.previous().value as '<' | '<=' | '>' | '>=';
      const location = this.previous().location;
      const right = this.additive();
      expr = {
        kind: 'Binary',
        operator,
        location,
        left: expr,
        right,
      };
    }

    return expr;
  }

  /**
   * Parse additive
   * a + b, a - b
   */
  private additive(): Expression {
    let expr = this.multiplicative();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().value as '+' | '-';
      const location = this.previous().location;
      const right = this.multiplicative();
      expr = {
        kind: 'Binary',
        operator,
        location,
        left: expr,
        right,
      };
    }

    return expr;
  }

  /**
   * Parse multiplicative
   * a * b, a / b, a % b
   */
  private multiplicative(): Expression {
    let expr = this.power();

    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
      const operator = this.previous().value as '*' | '/' | '%';
      const location = this.previous().location;
      const right = this.power();
      expr = {
        kind: 'Binary',
        operator,
        location,
        left: expr,
        right,
      };
    }

    return expr;
  }

  /**
   * Parse exponentiation (right-associative, binds tighter than *)
   * 2 ** 3 ** 2 is 2 ** (3 ** 2)
   */
  private power(): Expression {
    const base = this.unary();

    if (this.match(TokenType.POWER)) {
      const location = this.previous().location;
      const right = this.power();
      return {
        kind: 'Binary',
        operator: '**',
        left: base,
        right,
        location,
      };
    }

    return base;
  }

  /**
   * Parse unary
   * !a, -a
   */
  private unary(): Expression {
    if (this.match(TokenType.NOT, TokenType.MINUS)) {
      const operator = this.previous().value as '!' | '-';
      const location = this.previous().location;
      const operand = this.unary();
      return {
        kind: 'Unary',
        operator,
        operand,
        location,
      };
    }

    return this.call();
  }

  /**
   * Parse call and field access (postfix)
   * f(a, b), point.x, f(p).y
   */
  private call(): Expression {
    let expr = this.primary();

    for (;;) {
      if (this.match(TokenType.LPAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        const dotLocation = this.previous().location;
        const fieldToken = this.consume(TokenType.IDENTIFIER, 'field name');
        expr = {
          kind: 'FieldAccess',
          object: expr,
          field: fieldToken.value,
          location: dotLocation,
        };
      } else {
        break;
      }
    }

    return expr;
  }

  /**
   * Finish parsing a call expression
   */
  private finishCall(callee: Expression): CallExpr {
    const args: Expression[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RPAREN, ')');

    return {
      kind: 'Call',
      callee,
      arguments: args,
      location: callee.location,
    };
  }

  /**
   * Parse primary expression
   * literals, identifiers, if, functions, parentheses
   */
  private primary(): Expression {
    const location = this.peek().location;

    // Literals
    if (this.match(TokenType.INT)) {
      return {
        kind: 'Literal',
        value: parseInt(this.previous().value, 10),
        literalType: 'int',
        location,
      };
    }

    if (this.match(TokenType.FLOAT)) {
      return {
        kind: 'Literal',
        value: parseFloat(this.previous().value),
        literalType: 'float',
        location,
      };
    }

    if (this.match(TokenType.STRING)) {
      return {
        kind: 'Literal',
        value: this.previous().value,
        literalType: 'string',
        location,
      };
    }

    if (this.match(TokenType.TRUE)) {
      return {
        kind: 'Literal',
        value: true,
        literalType: 'boolean',
        location,
      };
    }

    if (this.match(TokenType.FALSE)) {
      return {
        kind: 'Literal',
        value: false,
        literalType: 'boolean',
        location,
      };
    }

    // If expression
    if (this.match(TokenType.IF)) {
      return this.ifExpression();
    }

    // Let expression
    if (this.match(TokenType.LET)) {
      return this.letExpression();
    }

    // Match expression
    if (this.match(TokenType.MATCH)) {
      return this.matchExpression();
    }

    // Record literal { x: 1, y: 2 } or record update { p | x: 1 }
    if (this.check(TokenType.LBRACE)) {
      return this.recordExpression();
    }

    // Function expression
    if (this.check(TokenType.LPAREN)) {
      // Check if this is a function or just a grouped expression
      // We need to peek ahead to see if there's a -> after the closing paren
      const checkpoint = this.current;
      this.advance(); // consume (

      // Try to parse as parameter list
      let isFunction = false;
      if (this.check(TokenType.RPAREN)) {
        // Could be () -> expr or just ()
        this.advance(); // consume )
        if (this.check(TokenType.ARROW)) {
          isFunction = true;
        }
      } else if (this.check(TokenType.IDENTIFIER)) {
        // Could be (a, b) -> expr or just (expr)
        while (this.match(TokenType.IDENTIFIER)) {
          if (this.check(TokenType.RPAREN)) {
            this.advance(); // consume )
            if (this.check(TokenType.ARROW)) {
              isFunction = true;
            }
            break;
          } else if (this.match(TokenType.COMMA)) {
            // Continue looking for identifiers
            isFunction = true; // (a, ...) is definitely function params
          } else {
            // Not a parameter list
            break;
          }
        }
      }

      // Reset and parse appropriately
      this.current = checkpoint;

      if (isFunction) {
        return this.functionExpression();
      } else {
        return this.groupedExpression();
      }
    }

    // Identifier or Constructor
    if (this.match(TokenType.IDENTIFIER)) {
      const name = this.previous().value;

      // Check if it's a constructor (uppercase first letter)
      if (name[0] === name[0].toUpperCase()) {
        // Constructor expression
        const args: Expression[] = [];

        // Check for arguments
        if (this.match(TokenType.LPAREN)) {
          if (!this.check(TokenType.RPAREN)) {
            do {
              args.push(this.expression());
            } while (this.match(TokenType.COMMA));
          }
          this.consume(TokenType.RPAREN, ')');
        }

        return {
          kind: 'Constructor',
          name,
          arguments: args,
          location,
        };
      } else {
        // Regular identifier
        return {
          kind: 'Identifier',
          name,
          location,
        };
      }
    }

    throw unexpectedToken('expression', this.peek());
  }

  /**
   * Parse an if expression
   * if condition then expr1 else expr2
   */
  private ifExpression(): IfExpr {
    const location = this.previous().location;
    const condition = this.expression();
    this.consume(TokenType.THEN, 'then');
    const thenBranch = this.expression();
    this.consume(TokenType.ELSE, 'else');
    const elseBranch = this.expression();

    return {
      kind: 'If',
      condition,
      thenBranch,
      elseBranch,
      location,
    };
  }

  /**
   * Parse a let expression
   * let x = expr1 in expr2
   */
  private letExpression(): import('./ast.js').LetExpr {
    const location = this.previous().location;
    const nameToken = this.consume(TokenType.IDENTIFIER, 'identifier');
    const name = nameToken.value;

    this.consume(TokenType.EQUAL, '=');
    const value = this.expression();

    this.consume(TokenType.IN, 'in');
    const body = this.expression();

    return {
      kind: 'LetExpr',
      name,
      value,
      body,
      location,
    };
  }

  /**
   * Parse a function expression
   * (a, b) -> a + b
   * () -> 42
   */
  private functionExpression(): FunctionExpr {
    const location = this.peek().location;
    this.consume(TokenType.LPAREN, '(');

    const parameters: string[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        const param = this.consume(TokenType.IDENTIFIER, 'parameter name');
        parameters.push(param.value);
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RPAREN, ')');
    this.consume(TokenType.ARROW, '->');

    const body = this.expression();

    return {
      kind: 'Function',
      parameters,
      body,
      location,
    };
  }

  /**
   * Parse a record literal or record update
   * { x: 1, y: 2 }       literal (first token after '{' is 'field:')
   * { p | x: 10 }        update of expression p
   */
  private recordExpression(): Expression {
    const location = this.peek().location;
    this.consume(TokenType.LBRACE, '{');

    // Literal when we see 'IDENT :', otherwise an update expression
    const isLiteral =
      this.check(TokenType.IDENTIFIER) && this.peekNext().type === TokenType.COLON;

    if (isLiteral) {
      const fields = this.recordFieldValues();
      this.consume(TokenType.RBRACE, '}');
      return { kind: 'RecordLiteral', fields, location };
    }

    const record = this.expression();
    this.consume(TokenType.PIPE, "'|' (record update is { record | field: value })");
    const fields = this.recordFieldValues();
    this.consume(TokenType.RBRACE, '}');
    return { kind: 'RecordUpdate', record, fields, location };
  }

  /**
   * Parse comma-separated 'field: expression' pairs
   */
  private recordFieldValues(): Array<{ name: string; value: Expression }> {
    const fields: Array<{ name: string; value: Expression }> = [];
    do {
      const nameToken = this.consume(TokenType.IDENTIFIER, 'field name');
      this.consume(TokenType.COLON, ':');
      const value = this.expression();
      fields.push({ name: nameToken.value, value });
    } while (this.match(TokenType.COMMA));
    return fields;
  }

  /**
   * Parse a grouped expression
   * (expr)
   */
  private groupedExpression(): Expression {
    this.consume(TokenType.LPAREN, '(');
    const expr = this.expression();
    this.consume(TokenType.RPAREN, ')');
    return expr;
  }

  /**
   * Parse a type declaration
   * type Option a = Some a | None
   * type Result a e = Ok a | Err e
   */
  private typeDeclaration(): import('./ast.js').TypeDeclaration | import('./ast.js').RecordDeclaration {
    const location = this.previous().location;
    const nameToken = this.consume(TokenType.IDENTIFIER, 'type name');
    const name = nameToken.value;

    // Parse type parameters (lowercase identifiers)
    const typeParams: string[] = [];
    while (this.check(TokenType.IDENTIFIER) && this.peek().value[0] === this.peek().value[0].toLowerCase()) {
      typeParams.push(this.advance().value);
    }

    this.consume(TokenType.EQUAL, '=');

    // Record type: type Point = { x: Int, y: Int }
    if (this.check(TokenType.LBRACE)) {
      return this.recordDeclaration(name, typeParams, location);
    }

    // Parse variants
    const variants: import('./ast.js').Variant[] = [];

    // Allow optional leading pipe for multi-line type declarations
    // Supports both: type T = A | B  and  type T = | A | B
    this.match(TokenType.PIPE);

    // First variant
    variants.push(this.variant());

    // Additional variants (with leading pipe)
    while (this.match(TokenType.PIPE)) {
      variants.push(this.variant());
    }

    return {
      kind: 'Type',
      name,
      typeParams,
      variants,
      location,
    };
  }

  /**
   * Parse the body of a record type declaration
   * { x: Int, y: Int }
   */
  private recordDeclaration(
    name: string,
    typeParams: string[],
    location: import('../lexer/token.js').SourceLocation
  ): import('./ast.js').RecordDeclaration {
    this.consume(TokenType.LBRACE, '{');

    const fields: import('./ast.js').RecordField[] = [];
    do {
      const fieldToken = this.consume(TokenType.IDENTIFIER, 'field name');
      this.consume(TokenType.COLON, ':');
      const annotation = this.typeAnnotation();
      fields.push({ name: fieldToken.value, annotation, location: fieldToken.location });
    } while (this.match(TokenType.COMMA));

    this.consume(TokenType.RBRACE, '}');

    return {
      kind: 'Record',
      name,
      typeParams,
      fields,
      location,
    };
  }

  /**
   * Parse a variant (constructor)
   * Some a
   * None
   * Ok a
   */
  private variant(): Variant {
    const nameToken = this.consume(TokenType.IDENTIFIER, 'variant name');
    const name = nameToken.value;

    const variantArgs: TypeAnnotation[] = [];

    // Parse arguments (type annotations)
    while (this.check(TokenType.IDENTIFIER) &&
           !this.check(TokenType.PIPE) &&
           !this.isAtEnd()) {
      // Check if it's a type variable or type name
      const peek = this.peek();
      if (peek.value === 'let' || peek.value === 'type') {
        break;  // Start of next declaration
      }
      // Non-greedy: 'Branch Tree Tree' is three separate argument types
      variantArgs.push(this.typeAnnotation(false));
    }

    return {
      name,
      arguments: variantArgs,
    };
  }

  /**
   * Parse a match expression
   * match expr with
   * | Some(x) -> x
   * | None -> 0
   * end
   */
  private matchExpression(): MatchExpr {
    const location = this.previous().location;
    const expr = this.expression();
    this.consume(TokenType.WITH, 'with');

    const cases: MatchCase[] = [];

    // Parse match cases
    // First case may or may not have leading pipe
    if (this.match(TokenType.PIPE)) {
      // Leading pipe
    }

    // Parse first case
    cases.push(this.matchCase());

    // Parse remaining cases
    while (this.match(TokenType.PIPE)) {
      cases.push(this.matchCase());
    }

    this.consume(TokenType.END, 'end');

    return {
      kind: 'Match',
      expr,
      cases,
      location,
    };
  }

  /**
   * Parse a single match case
   * pattern -> expression
   */
  private matchCase(): MatchCase {
    const pattern = this.pattern();
    this.consume(TokenType.ARROW, '->');
    const body = this.expression();

    return {
      pattern,
      body,
    };
  }

  /**
   * Parse a pattern
   * 42, x, Some(x), Constructor(a, b), _
   */
  private pattern(): Pattern {
    // Literal pattern
    if (this.check(TokenType.INT, TokenType.FLOAT, TokenType.STRING, TokenType.TRUE, TokenType.FALSE)) {
      return this.literalPattern();
    }

    // Wildcard pattern
    if (this.check(TokenType.IDENTIFIER) && this.peek().value === '_') {
      this.advance();
      return { kind: 'WildcardPattern' };
    }

    // Identifier or Constructor pattern
    if (this.check(TokenType.IDENTIFIER)) {
      const token = this.peek();
      const name = token.value;

      // Check if it's uppercase (constructor)
      if (name[0] === name[0].toUpperCase()) {
        return this.constructorPattern();
      } else {
        // Identifier pattern (binding)
        this.advance();
        return {
          kind: 'IdentifierPattern',
          name,
        };
      }
    }

    throw unexpectedToken('pattern', this.peek());
  }

  /**
   * Parse a literal pattern
   */
  private literalPattern(): LiteralPattern {
    if (this.match(TokenType.INT)) {
      return {
        kind: 'LiteralPattern',
        value: parseInt(this.previous().value, 10),
        literalType: 'int',
      };
    }

    if (this.match(TokenType.FLOAT)) {
      return {
        kind: 'LiteralPattern',
        value: parseFloat(this.previous().value),
        literalType: 'float',
      };
    }

    if (this.match(TokenType.STRING)) {
      return {
        kind: 'LiteralPattern',
        value: this.previous().value,
        literalType: 'string',
      };
    }

    if (this.match(TokenType.TRUE)) {
      return {
        kind: 'LiteralPattern',
        value: true,
        literalType: 'boolean',
      };
    }

    if (this.match(TokenType.FALSE)) {
      return {
        kind: 'LiteralPattern',
        value: false,
        literalType: 'boolean',
      };
    }

    throw unexpectedToken('literal', this.peek());
  }

  /**
   * Parse a constructor pattern
   * Some(x), None, Ok(value)
   */
  private constructorPattern(): ConstructorPattern {
    const nameToken = this.consume(TokenType.IDENTIFIER, 'constructor name');
    const constructor = nameToken.value;

    const args: Pattern[] = [];

    // Check for arguments
    if (this.match(TokenType.LPAREN)) {
      if (!this.check(TokenType.RPAREN)) {
        do {
          args.push(this.pattern());
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RPAREN, ')');
    }

    return {
      kind: 'ConstructorPattern',
      constructor,
      arguments: args,
      location: nameToken.location,
    };
  }
}

/**
 * Parse tokens into an AST
 */
export function parse(tokens: Token[]): Program {
  const parser = new Parser(tokens);
  return parser.program();
}
