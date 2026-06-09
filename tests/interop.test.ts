import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { pathToFileURL } from 'url';
import { tokenize } from '../src/lexer/lexer.js';
import { parse } from '../src/parser/parser.js';
import { inferTypes } from '../src/types/infer.js';
import { compile } from '../src/index.js';
import { loadProgram, FileReader } from '../src/modules/resolver.js';
import { inferModules } from '../src/types/infer.js';
import { generateModules } from '../src/codegen/codegen.js';
import { TypeError } from '../src/types/unify.js';

function runJs(jsCode: string): unknown[] {
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

/** Execute a bundle containing ESM imports as a real module */
async function runEsm(jsCode: string): Promise<unknown[]> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jenna-interop-'));
  const file = path.join(dir, 'bundle.mjs');
  const logged: unknown[] = [];
  const spy = vi.spyOn(console, 'log').mockImplementation((v) => {
    logged.push(v);
  });
  try {
    fs.writeFileSync(file, jsCode);
    await import(pathToFileURL(file).href);
  } finally {
    spy.mockRestore();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return logged;
}

function compileProjectFromMap(files: Record<string, string>, entry = '/main.jn'): string {
  const reader: FileReader = (p) => {
    if (!(p in files)) throw new Error(`no such file: ${p}`);
    return files[p];
  };
  const modules = loadProgram(entry, reader);
  inferModules(modules);
  return generateModules(modules);
}

describe('JavaScript Interop', () => {
  describe('Parsing', () => {
    it('parses expression externals', () => {
      const ast = parse(tokenize('external abs: (Int) -> Int = "Math.abs"'));
      const decl = ast.declarations[0];
      expect(decl.kind).toBe('External');
      if (decl.kind === 'External') {
        expect(decl.name).toBe('abs');
        expect(decl.jsValue).toBe('Math.abs');
        expect(decl.fromModule).toBeUndefined();
      }
    });

    it('parses from-module externals', () => {
      const ast = parse(tokenize('external rf: (String, String) -> String = "readFileSync" from "node:fs"'));
      const decl = ast.declarations[0];
      if (decl.kind === 'External') {
        expect(decl.jsValue).toBe('readFileSync');
        expect(decl.fromModule).toBe('node:fs');
      }
    });

    it('parses export external', () => {
      const ast = parse(tokenize('export external abs: (Int) -> Int = "Math.abs"'));
      expect((ast.declarations[0] as any).exported).toBe(true);
    });

    it('requires a type annotation', () => {
      expect(() => parse(tokenize('external abs = "Math.abs"'))).toThrow();
    });
  });

  describe('Type checking', () => {
    it('trusts the annotation at call sites', () => {
      const ok = 'external abs: (Int) -> Int = "Math.abs"\nlet x = abs(0 - 5) + 1';
      expect(() => inferTypes(parse(tokenize(ok)))).not.toThrow();

      const bad = 'external abs: (Int) -> Int = "Math.abs"\nlet x = abs("nope")';
      expect(() => inferTypes(parse(tokenize(bad)))).toThrow(TypeError);
    });

    it('supports polymorphic externals with consistent type variables', () => {
      // (a) -> a means the same 'a' in and out: result of unsafeId(1) is Int
      const source =
        'external unsafeId: (a) -> a = "(x) => x"\nlet x = unsafeId(1) + 1\nlet s = concat(unsafeId("a"), "b")';
      expect(() => inferTypes(parse(tokenize(source)))).not.toThrow();

      const bad = 'external unsafeId: (a) -> a = "(x) => x"\nlet x = unsafeId(1)\nlet y = concat(x, "s")';
      expect(() => inferTypes(parse(tokenize(bad)))).toThrow(TypeError);
    });

    it('rejects unknown types in external annotations', () => {
      const source = 'external f: (Foo) -> Int = "x => 1"';
      expect(() => inferTypes(parse(tokenize(source)))).toThrow('Unknown type: Foo');
    });
  });

  describe('Code generation', () => {
    it('wraps function externals at the annotated arity', () => {
      const code = compile('external f: (Int, Int) -> Int = "Math.max"');
      expect(code).toContain('const f = (a0, a1) => (Math.max)(a0, a1);');
    });

    it('binds constant externals without wrapping', () => {
      const code = compile('external pi: Float = "Math.PI"');
      expect(code).toContain('const pi = (Math.PI);');
    });

    it('hoists ESM imports for from-externals', () => {
      const code = compile('external platform: () -> String = "platform" from "node:os"');
      expect(code.startsWith('import { platform as $jenna_ext_0 } from "node:os";')).toBe(true);
      expect(code).toContain('const platform = () => $jenna_ext_0();');
    });
  });

  describe('End to end', () => {
    it('runs expression externals', () => {
      const logged = runJs(compile(`
external abs: (Int) -> Int = "Math.abs"
external toUpper: (String) -> String = "(s) => s.toUpperCase()"
let a = printInt(abs(0 - 42))
let b = print(toUpper("jenna"))`));
      expect(logged).toEqual([42, 'JENNA']);
    });

    it('arity wrapping prevents JS extra-argument quirks', () => {
      // parseInt's second parameter is a radix; the (String) -> Int wrapper
      // must not let extra arguments through
      const logged = runJs(compile(`
external toInt: (String) -> Int = "parseInt"
let out = printInt(toInt("08"))`));
      expect(logged).toEqual([8]);
    });

    it('runs from-externals against real node modules', async () => {
      const jsCode = compileProjectFromMap({
        '/main.jn': `
external platform: () -> String = "platform" from "node:os"
external pathJoin: (String, String) -> String = "join" from "node:path"
let a = printInt(stringLength(platform()))
let b = print(pathJoin("x", "y"))`,
      });
      const logged = await runEsm(jsCode);
      expect(logged[1]).toBe(path.join('x', 'y'));
      expect(typeof logged[0]).toBe('number');
      expect(logged[0]).toBeGreaterThan(0);
    });

    it('exports externals across modules', () => {
      const logged = runJs(compileProjectFromMap({
        '/mathx.jn': 'export external abs: (Int) -> Int = "Math.abs"',
        '/main.jn': 'import { abs } from "./mathx"\nlet out = printInt(abs(0 - 9))',
      }));
      expect(logged).toEqual([9]);
    });
  });
});
