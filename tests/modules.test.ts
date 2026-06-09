import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadProgram, ModuleError, FileReader } from '../src/modules/resolver.js';
import { inferModules } from '../src/types/infer.js';
import { generateModules } from '../src/codegen/codegen.js';
import { compile } from '../src/index.js';
import { tokenize } from '../src/lexer/lexer.js';
import { parse } from '../src/parser/parser.js';

/**
 * In-memory file system keyed by absolute path
 */
function reader(files: Record<string, string>): FileReader {
  return (p: string) => {
    if (!(p in files)) {
      throw new Error(`no such file: ${p}`);
    }
    return files[p];
  };
}

function compileProject(files: Record<string, string>, entry = '/main.jn'): string {
  const modules = loadProgram(entry, reader(files));
  inferModules(modules);
  return generateModules(modules);
}

/** Run bundled output, returning everything passed to console.log */
function runBundle(jsCode: string): unknown[] {
  const logged: unknown[] = [];
  const spy = vi.spyOn(console, 'log').mockImplementation((v) => {
    logged.push(v);
  });
  try {
    new Function(jsCode)();
  } finally {
    spy.mockRestore();
  }
  return logged;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Module System', () => {
  describe('Parsing', () => {
    it('parses import declarations', () => {
      const ast = parse(tokenize('import { add, Option } from "./math"\nlet x = 1'));
      const imp = ast.declarations[0];
      expect(imp.kind).toBe('Import');
      if (imp.kind === 'Import') {
        expect(imp.names.map(n => n.name)).toEqual(['add', 'Option']);
        expect(imp.path).toBe('./math');
      }
    });

    it('parses export on let and type declarations', () => {
      const ast = parse(tokenize('export let x = 1\nexport type Color = Red | Green\nlet y = 2'));
      expect((ast.declarations[0] as any).exported).toBe(true);
      expect((ast.declarations[1] as any).exported).toBe(true);
      expect((ast.declarations[2] as any).exported).toBeUndefined();
    });

    it('still allows "from" as an identifier', () => {
      const ast = parse(tokenize('let range = (from, to) -> to - from'));
      expect(ast.declarations).toHaveLength(1);
    });

    it('rejects export on expressions', () => {
      expect(() => parse(tokenize('export 5'))).toThrow();
    });
  });

  describe('Compilation and execution', () => {
    it('compiles and runs a two-module program', () => {
      const logged = runBundle(compileProject({
        '/math.jn': 'export let double = (x) -> x * 2',
        '/main.jn': 'import { double } from "./math"\nlet out = printInt(double(21))',
      }));
      expect(logged).toEqual([42]);
    });

    it('supports importing types and pattern matching on them', () => {
      const logged = runBundle(compileProject({
        '/option.jn': `
export type Option a = Some a | None
export let unwrapOr = (opt, fallback) ->
  match opt with
  | Some(x) -> x
  | None -> fallback
  end`,
        '/main.jn': `
import { Option, unwrapOr } from "./option"
let a = printInt(unwrapOr(Some(7), 0))
let b = printInt(unwrapOr(None, -1))`,
      }));
      expect(logged).toEqual([7, -1]);
    });

    it('supports transitive imports', () => {
      const logged = runBundle(compileProject({
        '/base.jn': 'export let one = 1',
        '/mid.jn': 'import { one } from "./base"\nexport let two = one + one',
        '/main.jn': 'import { two } from "./mid"\nlet out = printInt(two + 1)',
      }));
      expect(logged).toEqual([3]);
    });

    it('keeps private declarations from colliding across modules', () => {
      const logged = runBundle(compileProject({
        '/a.jn': 'let secret = 10\nexport let fromA = secret + 1',
        '/main.jn': 'import { fromA } from "./a"\nlet secret = 100\nlet out = printInt(fromA + secret)',
      }));
      expect(logged).toEqual([111]);
    });

    it('only loads each module once (diamond imports)', () => {
      const logged = runBundle(compileProject({
        '/base.jn': 'export let n = 1',
        '/left.jn': 'import { n } from "./base"\nexport let l = n + 1',
        '/right.jn': 'import { n } from "./base"\nexport let r = n + 2',
        '/main.jn': 'import { l } from "./left"\nimport { r } from "./right"\nlet out = printInt(l + r)',
      }));
      expect(logged).toEqual([5]);
    });
  });

  describe('Privacy and errors', () => {
    it('rejects importing a non-exported value', () => {
      expect(() => compileProject({
        '/lib.jn': 'let hidden = 1\nexport let visible = 2',
        '/main.jn': 'import { hidden } from "./lib"\nlet x = hidden',
      })).toThrow("Module './lib' has no exported value 'hidden'");
    });

    it('rejects importing an unknown name', () => {
      expect(() => compileProject({
        '/lib.jn': 'export let visible = 2',
        '/main.jn': 'import { missing } from "./lib"\nlet x = missing',
      })).toThrow("has no exported value 'missing'");
    });

    it('hints when importing a constructor instead of its type', () => {
      expect(() => compileProject({
        '/lib.jn': 'export type Color = Red | Green',
        '/main.jn': 'import { Red } from "./lib"\nlet x = 1',
      })).toThrow("'Red' is a constructor; import its type 'Color'");
    });

    it('rejects using constructors of a type that was not imported', () => {
      expect(() => compileProject({
        '/lib.jn': 'export type Color = Red | Green\nexport let favorite = Red',
        '/main.jn': 'import { favorite } from "./lib"\nlet x = Red',
      })).toThrow('Unknown constructor: Red');
    });

    it('detects import cycles', () => {
      expect(() => compileProject({
        '/a.jn': 'import { b } from "./b"\nexport let a = 1',
        '/b.jn': 'import { a } from "./a"\nexport let b = 2',
        '/main.jn': 'import { a } from "./a"\nlet x = a',
      })).toThrow(/Import cycle detected: .*a\.jn -> b\.jn -> a\.jn/);
    });

    it('reports missing modules with the importer', () => {
      expect(() => compileProject({
        '/main.jn': 'import { x } from "./nope"\nlet y = x',
      })).toThrow(/Cannot find module '\/nope\.jn' \(imported from \/main\.jn\)/);
    });

    it('rejects declaring a type that conflicts with an import', () => {
      expect(() => compileProject({
        '/lib.jn': 'export type Color = Red | Green',
        '/main.jn': 'import { Color } from "./lib"\ntype Color = Blue\nlet x = 1',
      })).toThrow('conflicts with an imported type');
    });

    it('tags errors with the module they came from', () => {
      try {
        compileProject({
          '/badlib.jn': 'export let bad = 1 + "x"',
          '/main.jn': 'import { bad } from "./badlib"\nlet x = bad',
        });
        expect.unreachable('should have thrown');
      } catch (error) {
        expect((error as Error & { modulePath?: string }).modulePath).toBe('/badlib.jn');
      }
    });

    it('type-checks values across module boundaries', () => {
      expect(() => compileProject({
        '/lib.jn': 'export let getNumber = () -> 42',
        '/main.jn': 'import { getNumber } from "./lib"\nlet x: String = getNumber()',
      })).toThrow('cannot unify');
    });
  });

  describe('Single-file compatibility', () => {
    it('compile() rejects sources with imports', () => {
      expect(() => compile('import { x } from "./y"\nlet a = 1')).toThrow(
        'Imports are only supported when compiling from a file'
      );
    });

    it('single-module projects produce runnable output', () => {
      const logged = runBundle(compileProject({
        '/main.jn': 'let out = printInt(1 + 2)',
      }));
      expect(logged).toEqual([3]);
    });
  });
});
