import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/lexer/lexer.js';
import { parse } from '../src/parser/parser.js';
import type {
  Program,
  LetDeclaration,
  LiteralExpr,
  BinaryExpr,
  FunctionExpr,
  CallExpr,
  IfExpr,
} from '../src/parser/ast.js';

describe('Parser', () => {
  describe('Let Declarations', () => {
    it('should parse a simple let binding', () => {
      const tokens = tokenize('let x = 5');
      const ast = parse(tokens);

      expect(ast.declarations).toHaveLength(1);
      const decl = ast.declarations[0] as LetDeclaration;
      expect(decl.kind).toBe('Let');
      expect(decl.name).toBe('x');
      expect((decl.value as LiteralExpr).value).toBe(5);
    });

    it('should parse let binding with type annotation', () => {
      const tokens = tokenize('let x: Int = 5');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      expect(decl.typeAnnotation).toBeDefined();
      expect(decl.typeAnnotation?.kind).toBe('PrimitiveType');
    });

    it('should parse multiple let declarations', () => {
      const tokens = tokenize('let x = 5 let y = 10');
      const ast = parse(tokens);

      expect(ast.declarations).toHaveLength(2);
    });
  });

  describe('Literals', () => {
    it('should parse integer literals', () => {
      const tokens = tokenize('let x = 42');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      const literal = decl.value as LiteralExpr;
      expect(literal.kind).toBe('Literal');
      expect(literal.value).toBe(42);
      expect(literal.literalType).toBe('int');
    });

    it('should parse float literals', () => {
      const tokens = tokenize('let x = 3.14');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      const literal = decl.value as LiteralExpr;
      expect(literal.value).toBe(3.14);
      expect(literal.literalType).toBe('float');
    });

    it('should parse string literals', () => {
      const tokens = tokenize('let x = "hello"');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      const literal = decl.value as LiteralExpr;
      expect(literal.value).toBe('hello');
      expect(literal.literalType).toBe('string');
    });

    it('should parse boolean literals', () => {
      const tokens = tokenize('let x = true let y = false');
      const ast = parse(tokens);

      const decl1 = ast.declarations[0] as LetDeclaration;
      const decl2 = ast.declarations[1] as LetDeclaration;
      expect((decl1.value as LiteralExpr).value).toBe(true);
      expect((decl2.value as LiteralExpr).value).toBe(false);
    });
  });

  describe('Binary Expressions', () => {
    it('should parse addition', () => {
      const tokens = tokenize('let x = 2 + 3');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      const binary = decl.value as BinaryExpr;
      expect(binary.kind).toBe('Binary');
      expect(binary.operator).toBe('+');
      expect((binary.left as LiteralExpr).value).toBe(2);
      expect((binary.right as LiteralExpr).value).toBe(3);
    });

    it('should parse operator precedence correctly', () => {
      const tokens = tokenize('let x = 2 + 3 * 4');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      const binary = decl.value as BinaryExpr;

      // Should be: 2 + (3 * 4)
      expect(binary.operator).toBe('+');
      expect((binary.left as LiteralExpr).value).toBe(2);
      expect((binary.right as BinaryExpr).operator).toBe('*');
    });

    it('should parse parenthesized expressions', () => {
      const tokens = tokenize('let x = (2 + 3) * 4');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      const binary = decl.value as BinaryExpr;

      // Should be: (2 + 3) * 4
      expect(binary.operator).toBe('*');
      expect((binary.left as BinaryExpr).operator).toBe('+');
    });

    it('should parse comparison operators', () => {
      const tokens = tokenize('let x = 5 > 3');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      const binary = decl.value as BinaryExpr;
      expect(binary.operator).toBe('>');
    });

    it('should parse logical operators', () => {
      const tokens = tokenize('let x = true && false || true');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      const binary = decl.value as BinaryExpr;

      // Should be: (true && false) || true
      expect(binary.operator).toBe('||');
      expect((binary.left as BinaryExpr).operator).toBe('&&');
    });
  });

  describe('Functions', () => {
    it('should parse function definition', () => {
      const tokens = tokenize('let add = (a, b) -> a + b');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      const func = decl.value as FunctionExpr;
      expect(func.kind).toBe('Function');
      expect(func.parameters).toEqual(['a', 'b']);
      expect((func.body as BinaryExpr).operator).toBe('+');
    });

    it('should parse function with no parameters', () => {
      const tokens = tokenize('let fortytwo = () -> 42');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      const func = decl.value as FunctionExpr;
      expect(func.parameters).toEqual([]);
      expect((func.body as LiteralExpr).value).toBe(42);
    });

    it('should parse function with type annotation', () => {
      const tokens = tokenize('let add: (Int, Int) -> Int = (a, b) -> a + b');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      expect(decl.typeAnnotation).toBeDefined();
      expect(decl.typeAnnotation?.kind).toBe('FunctionType');
    });
  });

  describe('Function Calls', () => {
    it('should parse function call', () => {
      const tokens = tokenize('let result = add(2, 3)');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      const call = decl.value as CallExpr;
      expect(call.kind).toBe('Call');
      expect(call.arguments).toHaveLength(2);
    });

    it('should parse function call with no arguments', () => {
      const tokens = tokenize('let result = foo()');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      const call = decl.value as CallExpr;
      expect(call.arguments).toHaveLength(0);
    });

    it('should parse nested function calls', () => {
      const tokens = tokenize('let result = add(mul(2, 3), 4)');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      const call = decl.value as CallExpr;
      expect(call.kind).toBe('Call');
      expect((call.arguments[0] as CallExpr).kind).toBe('Call');
    });
  });

  describe('If Expressions', () => {
    it('should parse if expression', () => {
      const tokens = tokenize('let x = if true then 1 else 2');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      const ifExpr = decl.value as IfExpr;
      expect(ifExpr.kind).toBe('If');
      expect((ifExpr.thenBranch as LiteralExpr).value).toBe(1);
      expect((ifExpr.elseBranch as LiteralExpr).value).toBe(2);
    });

    it('should parse nested if expressions', () => {
      const tokens = tokenize('let x = if true then if false then 1 else 2 else 3');
      const ast = parse(tokens);

      const decl = ast.declarations[0] as LetDeclaration;
      const ifExpr = decl.value as IfExpr;
      expect(ifExpr.kind).toBe('If');
      expect((ifExpr.thenBranch as IfExpr).kind).toBe('If');
    });
  });

  describe('Complex Programs', () => {
    it('should parse factorial function', () => {
      const source = `
        let factorial = (n) ->
          if n == 0 then
            1
          else
            n * factorial(n - 1)
      `;
      const tokens = tokenize(source);
      const ast = parse(tokens);

      expect(ast.declarations).toHaveLength(1);
      const decl = ast.declarations[0] as LetDeclaration;
      expect(decl.name).toBe('factorial');
      expect((decl.value as FunctionExpr).kind).toBe('Function');
    });

    it('should parse multiple function definitions', () => {
      const source = `
        let add = (a, b) -> a + b
        let mul = (a, b) -> a * b
        let compute = (x) -> add(mul(x, 2), 5)
      `;
      const tokens = tokenize(source);
      const ast = parse(tokens);

      expect(ast.declarations).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should throw on unexpected token', () => {
      const tokens = tokenize('let = 5');
      expect(() => parse(tokens)).toThrow();
    });

    it('should throw on missing then in if', () => {
      const tokens = tokenize('let x = if true 1 else 2');
      expect(() => parse(tokens)).toThrow();
    });

    it('should throw on missing else in if', () => {
      const tokens = tokenize('let x = if true then 1');
      expect(() => parse(tokens)).toThrow();
    });

    it('should throw on invalid type annotation', () => {
      const tokens = tokenize('let x: Foo = 5');
      expect(() => parse(tokens)).toThrow();
    });
  });
});
