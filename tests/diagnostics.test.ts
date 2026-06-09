import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/lexer/lexer.js';
import { parse } from '../src/parser/parser.js';
import { inferTypes } from '../src/types/infer.js';
import { formatError } from '../src/diagnostics.js';
import { TypeError } from '../src/types/unify.js';
import { ParseError } from '../src/parser/errors.js';

function inferError(source: string): Error {
  try {
    inferTypes(parse(tokenize(source)));
  } catch (error) {
    return error as Error;
  }
  throw new Error('expected source to fail type checking');
}

function parseFailure(source: string): Error {
  try {
    parse(tokenize(source));
  } catch (error) {
    return error as Error;
  }
  throw new Error('expected source to fail parsing');
}

describe('Diagnostics', () => {
  describe('Location tracking', () => {
    it('attaches location to undefined variable errors', () => {
      const error = inferError('let greet = (name) -> print(nmae)') as TypeError;
      expect(error.location).toBeDefined();
      expect(error.location!.line).toBe(1);
      expect(error.location!.column).toBe(29);
    });

    it('attaches location to annotation mismatches', () => {
      const error = inferError('let add = (a, b) -> a + b\nlet x: Int = "hello"') as TypeError;
      expect(error.location).toBeDefined();
      expect(error.location!.line).toBe(2);
      expect(error.location!.column).toBe(14);
    });

    it('attaches location to unknown type names', () => {
      const error = inferError('let x: Foo = 5') as TypeError;
      expect(error.location).toBeDefined();
      expect(error.location!.column).toBe(8);
    });

    it('attaches location to unknown constructors', () => {
      const error = inferError('let x = Sone(5)') as TypeError;
      expect(error.location).toBeDefined();
      expect(error.location!.column).toBe(9);
    });

    it('attaches location to parse errors', () => {
      const error = parseFailure('let x = if true 1 else 2') as ParseError;
      expect(error.location).toBeDefined();
      expect(error.location.line).toBe(1);
      expect(error.location.column).toBe(17);
    });

    it('points at the innermost failing expression', () => {
      const source = 'let f = (x) ->\n  if x > 0 then\n    x + "oops"\n  else\n    0';
      const error = inferError(source) as TypeError;
      expect(error.location).toBeDefined();
      expect(error.location!.line).toBe(3);
    });
  });

  describe('formatError', () => {
    it('renders a snippet with caret underline', () => {
      const source = 'let x: Int = "hello"';
      const formatted = formatError(inferError(source), source, 'test.jn');
      expect(formatted).toContain('Type error:');
      expect(formatted).toContain('--> test.jn:1:14');
      expect(formatted).toContain('1 | let x: Int = "hello"');
      expect(formatted).toContain('^^^^^^^');
    });

    it('falls back to plain message without location', () => {
      const error = new TypeError('something went wrong');
      expect(formatError(error, 'let x = 1')).toBe('Type error: something went wrong');
    });

    it('labels parse errors', () => {
      const source = 'let x = if true 1 else 2';
      const formatted = formatError(parseFailure(source), source);
      expect(formatted).toContain('Parse error:');
      expect(formatted).toContain('<input>:1:17');
    });

    it('handles errors on later lines of multi-line programs', () => {
      const source = 'let a = 1\nlet b = 2\nlet c = undefined_thing';
      const formatted = formatError(inferError(source), source, 'multi.jn');
      expect(formatted).toContain('multi.jn:3:9');
      expect(formatted).toContain('3 | let c = undefined_thing');
    });
  });
});
