import * as path from 'path';
import { tokenize } from '../lexer/lexer.js';
import { parse } from '../parser/parser.js';
import { Program, ImportDeclaration } from '../parser/ast.js';

/**
 * A resolved module: parsed source plus its place in the dependency graph
 */
export interface Module {
  /** Absolute, normalized path identifying this module */
  path: string;
  source: string;
  ast: Program;
  imports: ResolvedImport[];
}

/**
 * An import statement resolved to the absolute path of its target module
 */
export interface ResolvedImport {
  declaration: ImportDeclaration;
  resolvedPath: string;
}

/**
 * Error during module resolution (missing file, import cycle)
 */
export class ModuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModuleError';
  }
}

/**
 * Reads a module's source given its absolute path.
 * Injectable so tests can supply in-memory file systems.
 */
export type FileReader = (absolutePath: string) => string;

/**
 * Resolve an import path relative to the importing module.
 * Appends .jn when the extension is omitted.
 */
export function resolveImportPath(importerPath: string, importPath: string): string {
  const withExt = importPath.endsWith('.jn') ? importPath : `${importPath}.jn`;
  return path.resolve(path.dirname(importerPath), withExt);
}

/**
 * Load a program starting from its entry module.
 *
 * Returns all reachable modules in dependency order (dependencies before
 * dependents, entry module last), ready for type checking and codegen.
 * Throws ModuleError on missing files and import cycles.
 */
export function loadProgram(entryPath: string, readFile: FileReader): Module[] {
  const modules = new Map<string, Module>();
  const sorted: Module[] = [];
  // 'loading' marks modules on the current import chain for cycle detection
  const state = new Map<string, 'loading' | 'loaded'>();

  function load(absolutePath: string, chain: string[]): void {
    if (state.get(absolutePath) === 'loaded') {
      return;
    }
    if (state.get(absolutePath) === 'loading') {
      const cycle = [...chain.slice(chain.indexOf(absolutePath)), absolutePath]
        .map(p => path.basename(p))
        .join(' -> ');
      throw new ModuleError(`Import cycle detected: ${cycle}`);
    }

    state.set(absolutePath, 'loading');

    let source: string;
    try {
      source = readFile(absolutePath);
    } catch {
      const importer = chain.length > 0 ? ` (imported from ${chain[chain.length - 1]})` : '';
      throw new ModuleError(`Cannot find module '${absolutePath}'${importer}`);
    }

    let ast: Program;
    try {
      ast = parse(tokenize(source));
    } catch (error) {
      // Tag lex/parse errors with the module they came from so
      // diagnostics can show the right source file
      if (error instanceof Error && !('modulePath' in error)) {
        (error as Error & { modulePath: string }).modulePath = absolutePath;
      }
      throw error;
    }

    const imports: ResolvedImport[] = [];
    for (const decl of ast.declarations) {
      if (decl.kind === 'Import') {
        const resolvedPath = resolveImportPath(absolutePath, decl.path);
        imports.push({ declaration: decl, resolvedPath });
        load(resolvedPath, [...chain, absolutePath]);
      }
    }

    const module: Module = { path: absolutePath, source, ast, imports };
    modules.set(absolutePath, module);
    state.set(absolutePath, 'loaded');
    sorted.push(module);
  }

  load(path.resolve(entryPath), []);
  return sorted;
}
