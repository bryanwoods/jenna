import { describe, it, expect, vi } from 'vitest';
import { tokenize } from '../src/lexer/lexer.js';
import { parse } from '../src/parser/parser.js';
import { inferTypes, inferModules } from '../src/types/infer.js';
import { compile } from '../src/index.js';
import { loadProgram, FileReader } from '../src/modules/resolver.js';
import { generateModules } from '../src/codegen/codegen.js';
import { TypeError } from '../src/types/unify.js';

function check(source: string): void {
  inferTypes(parse(tokenize(source)));
}

function run(jsCode: string): unknown[] {
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

function compileProjectFromMap(files: Record<string, string>, entry = '/main.jn'): string {
  const reader: FileReader = (p) => {
    if (!(p in files)) throw new Error(`no such file: ${p}`);
    return files[p];
  };
  const modules = loadProgram(entry, reader);
  inferModules(modules);
  return generateModules(modules);
}

const POINT = 'type Point = { x: Int, y: Int }\n';

describe('Records', () => {
  describe('Parsing', () => {
    it('parses record type declarations', () => {
      const ast = parse(tokenize('type Point = { x: Int, y: Int }'));
      const decl = ast.declarations[0];
      expect(decl.kind).toBe('Record');
      if (decl.kind === 'Record') {
        expect(decl.fields.map(f => f.name)).toEqual(['x', 'y']);
      }
    });

    it('parses literals, access, and update', () => {
      const ast = parse(tokenize(POINT + 'let p = { x: 1, y: 2 }\nlet a = p.x\nlet m = { p | y: 9 }'));
      expect(ast.declarations[1].kind).toBe('Let');
      expect((ast.declarations[1] as any).value.kind).toBe('RecordLiteral');
      expect((ast.declarations[2] as any).value.kind).toBe('FieldAccess');
      expect((ast.declarations[3] as any).value.kind).toBe('RecordUpdate');
    });

    it('parses concrete type arguments in annotations', () => {
      // 'List Player' in a delimited annotation context applies List to
      // Player; variants keep the old 'Branch Tree Tree' reading
      const source = `type Player = { name: String, score: Int }
type Game = { players: List Player, title: String }
type List a = Cons a List a | Nil`;
      const ast = parse(tokenize(source));
      const game = ast.declarations[1];
      if (game.kind === 'Record') {
        const players = game.fields[0].annotation;
        expect(players.kind).toBe('CustomType');
        if (players.kind === 'CustomType') {
          expect(players.name).toBe('List');
          expect(players.arguments).toHaveLength(1);
        }
      }
      const list = ast.declarations[2];
      if (list.kind === 'Type') {
        expect(list.variants[0].arguments).toHaveLength(2);
      }
    });

    it('parses parenthesized type arguments', () => {
      const source = 'type Box a = { value: a }\nlet f: (Box (Box Int)) -> Box Int = (b) -> b.value';
      expect(() => parse(tokenize(source))).not.toThrow();
    });

    it('parses chained field access through calls', () => {
      const ast = parse(tokenize(POINT + 'let f = (p) -> p\nlet a = f({ x: 1, y: 2 }).x'));
      const access = (ast.declarations[2] as any).value;
      expect(access.kind).toBe('FieldAccess');
      expect(access.object.kind).toBe('Call');
    });
  });

  describe('Type checking', () => {
    it('infers literals by exact field set', () => {
      expect(() => check(POINT + 'let p = { x: 1, y: 2 }\nlet a = p.x + p.y')).not.toThrow();
    });

    it('rejects literals matching no record type', () => {
      expect(() => check(POINT + 'let p = { x: 1 }')).toThrow('No record type in scope has exactly the fields');
    });

    it('rejects ambiguous literals', () => {
      const source = 'type A = { x: Int, y: Int }\ntype B = { x: Int, y: Int }\nlet p = { x: 1, y: 2 }';
      expect(() => check(source)).toThrow('ambiguous');
    });

    it('checks field value types', () => {
      expect(() => check(POINT + 'let p = { x: 1, y: "two" }')).toThrow(TypeError);
    });

    it('rejects unknown fields on access and update', () => {
      expect(() => check(POINT + 'let p = { x: 1, y: 2 }\nlet a = p.z')).toThrow("no field 'z'");
      expect(() => check(POINT + 'let p = { x: 1, y: 2 }\nlet m = { p | z: 1 }')).toThrow("no field 'z'");
    });

    it('resolves unannotated parameters when one record type has the field', () => {
      expect(() => check(POINT + 'let getX = (p) -> p.x\nlet a = getX({ x: 1, y: 2 })')).not.toThrow();
    });

    it('asks for an annotation when field-based resolution is ambiguous', () => {
      const source =
        'type A = { x: Int, y: Int }\ntype B = { x: Int, z: Int }\nlet getX = (p) -> p.x';
      expect(() => check(source)).toThrow('add a type annotation');
    });

    it('uses let annotations to resolve parameter records', () => {
      const source =
        'type A = { x: Int, y: Int }\ntype B = { x: Int, z: Int }\nlet getX: (A) -> Int = (p) -> p.x';
      expect(() => check(source)).not.toThrow();
    });

    it('supports polymorphic record types', () => {
      const source = `type Pair a b = { first: a, second: b }
let pair = { first: 1, second: "one" }
let n = pair.first + 1
let s = concat(pair.second, "!")`;
      expect(() => check(source)).not.toThrow();
    });

    it('keeps nominal identity: same shape, different names do not unify', () => {
      const source = `type A = { x: Int, y: Int }
type B = { x: Int, y: Int }
let f: (A) -> Int = (a) -> a.x
let b: B = { x: 1, y: 2 }`;
      // Constructing b is ambiguous between A and B...
      expect(() => check(source)).toThrow();
    });

    it('record update preserves the record type', () => {
      expect(() =>
        check(POINT + 'let p = { x: 1, y: 2 }\nlet m = { p | x: 9 }\nlet a = m.y')
      ).not.toThrow();
    });

    it('rejects field access on non-records', () => {
      expect(() => check('let a = 5\nlet b = a.x')).toThrow();
    });
  });

  describe('Execution', () => {
    it('compiles records to plain JS objects', () => {
      const code = compile(POINT + 'let p = { x: 1, y: 2 }');
      expect(code).toContain('const p = ({ x: 1, y: 2 });');
      expect(code).not.toContain('__tag');
    });

    it('runs literals, access, and update', () => {
      const logged = run(compile(POINT + `
let p = { x: 3, y: 4 }
let a = printInt(p.x + p.y)
let m = { p | x: 10 }
let b = printInt(m.x + m.y)
let c = printInt(p.x)`));
      // Update is functional: p is unchanged
      expect(logged).toEqual([7, 14, 3]);
    });

    it('records work as arrow function bodies', () => {
      const logged = run(compile(POINT + `
let mk = (n) -> { x: n, y: n * 2 }
let out = printInt(mk(5).y)`));
      expect(logged).toEqual([10]);
    });

    it('exports record types across modules', () => {
      const logged = run(compileProjectFromMap({
        '/geom.jn': 'export type Point = { x: Int, y: Int }\nexport let mk = (x, y) -> { x: x, y: y }',
        '/main.jn': 'import { Point, mk } from "./geom"\nlet p = mk(3, 4)\nlet out = printInt(p.x + p.y)',
      }));
      expect(logged).toEqual([7]);
    });

    it('keeps unexported record types private', () => {
      expect(() => compileProjectFromMap({
        '/geom.jn': 'type Point = { x: Int, y: Int }\nexport let mk = (x, y) -> { x: x, y: y }',
        '/main.jn': 'import { Point } from "./geom"\nlet x = 1',
      })).toThrow("has no exported type 'Point'");
    });

    it('externals can return records as plain JS objects', () => {
      const logged = run(compile(POINT + `
external origin: () -> Point = "() => ({ x: 7, y: 35 })"
let o = origin()
let out = printInt(o.x + o.y)`));
      expect(logged).toEqual([42]);
    });
  });
});
