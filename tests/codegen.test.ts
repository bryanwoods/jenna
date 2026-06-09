import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/lexer/lexer.js';
import { parse } from '../src/parser/parser.js';
import { inferTypes } from '../src/types/infer.js';
import { generateCode } from '../src/codegen/codegen.js';

describe('Code Generation', () => {
  function compile(source: string): string {
    const tokens = tokenize(source);
    const ast = parse(tokens);
    inferTypes(ast);
    return generateCode(ast);
  }

  describe('Literals', () => {
    it('should generate code for integer', () => {
      const code = compile('let x = 42');
      expect(code).toContain('const x = 42;');
    });

    it('should generate code for string', () => {
      const code = compile('let x = "hello"');
      expect(code).toContain('const x = "hello";');
    });

    it('should generate code for boolean', () => {
      const code = compile('let x = true');
      expect(code).toContain('const x = true;');
    });
  });

  describe('Binary Expressions', () => {
    it('should generate code for addition', () => {
      const code = compile('let x = 2 + 3');
      expect(code).toContain('const x = (2 + 3);');
    });

    it('should handle operator precedence', () => {
      const code = compile('let x = 2 + 3 * 4');
      expect(code).toContain('(2 + (3 * 4))');
    });

    it('should generate truncating integer division', () => {
      const code = compile('let x = 7 / 2');
      expect(code).toContain('Math.trunc(7 / 2)');
      const result = new Function(code + '\nreturn x;')();
      expect(result).toBe(3);
    });
  });

  describe('Functions', () => {
    it('should generate arrow function', () => {
      const code = compile('let add = (a, b) -> a + b');
      expect(code).toContain('const add = (a, b) => (a + b);');
    });

    it('should generate function with no params', () => {
      const code = compile('let fortytwo = () -> 42');
      expect(code).toContain('const fortytwo = () => 42;');
    });
  });

  describe('Function Calls', () => {
    it('should generate function call', () => {
      const code = compile(`
        let add = (a, b) -> a + b
        let result = add(2, 3)
      `);
      expect(code).toContain('add(2, 3)');
    });
  });

  describe('If Expressions', () => {
    it('should generate ternary operator', () => {
      const code = compile('let x = if true then 1 else 2');
      expect(code).toContain('(true ? 1 : 2)');
    });
  });

  describe('Complex Programs', () => {
    it('should compile factorial', () => {
      const code = compile(`
        let factorial = (n) ->
          if n == 0 then
            1
          else
            n * factorial(n - 1)
      `);

      expect(code).toContain('const factorial =');
      expect(code).toContain('=>');
      expect(code).toContain('?');
      expect(code).toContain('factorial');
    });

    it('should include runtime library', () => {
      const code = compile('let x = print("hello")');
      expect(code).toContain('// Jenna Runtime Library');
      expect(code).toContain('const print =');
    });
  });

  describe('End-to-End', () => {
    it('should produce runnable JavaScript', () => {
      const jennaCode = `
        let add = (a, b) -> a + b
        let result = add(2, 3)
      `;

      const jsCode = compile(jennaCode);

      // Check that it's valid JS
      expect(() => {
        new Function(jsCode);
      }).not.toThrow();
    });

    it('should compile and run factorial', () => {
      const jennaCode = `
        let factorial = (n) ->
          if n == 0 then
            1
          else
            n * factorial(n - 1)
        let result = factorial(5)
      `;

      const jsCode = compile(jennaCode);

      // Execute the generated code
      const fn = new Function(jsCode + '; return result;');
      const result = fn();

      expect(result).toBe(120);
    });
  });
});
