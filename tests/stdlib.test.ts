import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { compileProject } from '../src/index.js';

const fixturesDir = path.dirname(fileURLToPath(import.meta.url));
const fsReader = (p: string) => fs.readFileSync(p, 'utf-8');

function runFile(entryPath: string): unknown[] {
  const jsCode = compileProject(entryPath, fsReader);
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

describe('Standard Library Prelude', () => {
  it('compiles and runs a program exercising std/list, option, result, string', () => {
    const logged = runFile(path.join(fixturesDir, 'fixtures/prelude-demo.jn'));
    expect(logged).toEqual([
      // List
      15,        // sum [1..5]
      150,       // sum of elements * 10
      3,         // count of elements > 2
      5,         // head of reversed [1..5]
      10,        // length of nums ++ nums
      55,        // sum of squares
      true,      // any == 3
      true,      // all > 0
      // Option
      6,         // mapOption(Some(5), +1) unwrapped
      true,      // andThen keeps Some
      // Result
      30,        // mapResult(Ok(10), *3) unwrapped
      false,     // isOk(Err)
      true,      // okToOption(Ok) is Some
      // String
      '1-2-3-4-5',
      'ababab',
    ]);
  });

  it('resolves bare std/ imports without a relative prefix', () => {
    const entry = path.join(fixturesDir, 'fixtures/prelude-demo.jn');
    expect(() => compileProject(entry, fsReader)).not.toThrow();
  });

  it('keeps prelude internals private', () => {
    // std/list imports Option from std/option but does not re-export it;
    // a program importing only std/list cannot use Some
    const dir = fs.mkdtempSync(path.join(process.cwd(), '.tmp-stdlib-test-'));
    const entry = path.join(dir, 'main.jn');
    try {
      fs.writeFileSync(entry, 'import { head } from "std/list"\nlet x = Some(1)\n');
      expect(() => compileProject(entry, fsReader)).toThrow('Unknown constructor: Some');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
