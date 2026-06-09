import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/lexer/lexer.js';
import { parse } from '../src/parser/parser.js';
import { inferTypes } from '../src/types/infer.js';
import { TypeError } from '../src/types/unify.js';

describe('Type Inference', () => {
  describe('Literals', () => {
    it('should infer integer type', () => {
      const source = 'let x = 42';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });

    it('should infer float type', () => {
      const source = 'let x = 3.14';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });

    it('should infer string type', () => {
      const source = 'let x = "hello"';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });

    it('should infer boolean type', () => {
      const source = 'let x = true';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });
  });

  describe('Arithmetic', () => {
    it('should infer type for addition', () => {
      const source = 'let x = 2 + 3';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });

    it('should reject string + int', () => {
      const source = 'let x = "hello" + 5';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).toThrow(TypeError);
    });

    it('should handle complex arithmetic', () => {
      const source = 'let x = (2 + 3) * 4 - 1';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });
  });

  describe('Comparisons', () => {
    it('should infer bool type for comparison', () => {
      const source = 'let x = 5 > 3';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });

    it('should allow comparing same types', () => {
      const source = 'let x = "hello" == "world"';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });
  });

  describe('Functions', () => {
    it('should infer function type', () => {
      const source = 'let add = (a, b) -> a + b';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });

    it('should infer function with no parameters', () => {
      const source = 'let fortytwo = () -> 42';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });

    it('should enforce type annotation', () => {
      const source = 'let add: (Int, Int) -> Int = (a, b) -> a + b';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });

    it('should reject incorrect type annotation', () => {
      const source = 'let wrong: Int = (a, b) -> a + b';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).toThrow(TypeError);
    });
  });

  describe('Function Calls', () => {
    it('should type check function calls', () => {
      const source = `
        let add = (a, b) -> a + b
        let result = add(2, 3)
      `;
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });

    it('should reject wrong number of arguments', () => {
      const source = `
        let add = (a, b) -> a + b
        let result = add(2)
      `;
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).toThrow(TypeError);
    });

    it('should handle nested calls', () => {
      const source = `
        let add = (a, b) -> a + b
        let mul = (a, b) -> a * b
        let result = add(mul(2, 3), 4)
      `;
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });
  });

  describe('If Expressions', () => {
    it('should type check if expression', () => {
      const source = 'let x = if true then 1 else 2';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });

    it('should require bool condition', () => {
      const source = 'let x = if 5 then 1 else 2';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).toThrow(TypeError);
    });

    it('should require matching branch types', () => {
      const source = 'let x = if true then 1 else "hello"';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).toThrow(TypeError);
    });
  });

  describe('Recursion', () => {
    it('should handle recursive functions', () => {
      const source = `
        let factorial = (n) ->
          if n == 0 then
            1
          else
            n * factorial(n - 1)
      `;
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });

    it('should handle mutually recursive functions', () => {
      const source = `
        let isEven = (n) ->
          if n == 0 then
            true
          else
            isOdd(n - 1)
        let isOdd = (n) ->
          if n == 0 then
            false
          else
            isEven(n - 1)
      `;
      const tokens = tokenize(source);
      const ast = parse(tokens);
      // This will fail because isOdd is not defined when isEven is declared
      // In a real implementation, we'd need let-rec or forward declarations
      expect(() => inferTypes(ast)).toThrow(TypeError);
    });
  });

  describe('Higher-Order Functions', () => {
    it('should handle functions returning functions', () => {
      const source = 'let makeAdder = (x) -> (y) -> x + y';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });

    it('should handle functions taking functions', () => {
      const source = `
        let twice = (f, x) -> f(f(x))
        let addOne = (x) -> x + 1
        let result = twice(addOne, 5)
      `;
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });
  });

  describe('Error Messages', () => {
    it('should report undefined variable', () => {
      const source = 'let x = foo';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).toThrow('Undefined variable');
    });

    it('should report type mismatch in declaration', () => {
      const source = 'let x: Int = "hello"';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).toThrow(TypeError);
    });
  });

  describe('Let-Polymorphism', () => {
    it('allows a let-bound function at multiple types', () => {
      const source = 'let id = (x) -> x\nlet a = id(1)\nlet b = id("s")';
      expect(() => inferTypes(parse(tokenize(source)))).not.toThrow();
    });

    it('allows polymorphic use within let expressions', () => {
      const source = 'let r =\n  let id = (x) -> x in\n  id(1) + (if id(true) then 1 else 0)';
      expect(() => inferTypes(parse(tokenize(source)))).not.toThrow();
    });

    it('generalizes recursive functions after their own inference', () => {
      const source = `type List a = Cons a List a | Nil
let length = (lst) ->
  match lst with
  | Nil -> 0
  | Cons(_, t) -> 1 + length(t)
  end
let a = length(Cons(1, Nil))
let b = length(Cons("s", Nil))`;
      expect(() => inferTypes(parse(tokenize(source)))).not.toThrow();
    });

    it('keeps lambda parameters monomorphic', () => {
      const source = 'let bad = (f) ->\n  let r1 = f(1) in\n  f("x")';
      expect(() => inferTypes(parse(tokenize(source)))).toThrow(TypeError);
    });

    it('keeps recursive self-reference monomorphic during inference', () => {
      // Using the recursive binding at two types inside its own body is
      // not allowed (monomorphic recursion)
      const source = 'let f = (x) -> if true then x else f(f(x))';
      expect(() => inferTypes(parse(tokenize(source)))).not.toThrow();
    });
  });

  describe('Type Annotations', () => {
    it('should reject unknown type names', () => {
      const source = 'let x: Foo = 5';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).toThrow('Unknown type: Foo');
    });

    it('should reject unknown type names inside function types', () => {
      const source = 'let f: (Foo) -> Foo = (x) -> x';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).toThrow('Unknown type: Foo');
    });

    it('should accept annotations referencing declared ADTs', () => {
      const source = 'type Color = Red | Green | Blue\nlet c: Color = Red';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });

    it('should reject wrong number of type arguments', () => {
      const source = 'type Option a = Some a | None\nlet x: Option = None';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).toThrow('expects 1 type argument(s), got 0');
    });

    it('should not leak ADTs between separate programs', () => {
      const first = parse(tokenize('type Color = Red | Green'));
      inferTypes(first);
      const second = parse(tokenize('let c: Color = 5'));
      expect(() => inferTypes(second)).toThrow('Unknown type: Color');
    });
  });

  describe('Standard Library', () => {
    it('should have print function', () => {
      const source = 'let result = print("hello")';
      const tokens = tokenize(source);
      const ast = parse(tokens);
      expect(() => inferTypes(ast)).not.toThrow();
    });
  });
});
