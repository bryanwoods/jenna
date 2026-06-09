// Main compiler API
import { tokenize as lexerTokenize } from './lexer/lexer.js';
import { parse as parserParse } from './parser/parser.js';
import { inferTypes as typeInfer, inferModules } from './types/infer.js';
import { generateCode as codegenGenerate, generateModules } from './codegen/codegen.js';
import { loadProgram, ModuleError, FileReader } from './modules/resolver.js';

export { tokenize, LexError } from './lexer/lexer.js';
export { formatError } from './diagnostics.js';
export { parse } from './parser/parser.js';
export { inferTypes, inferModules } from './types/infer.js';
export { generateCode, generateModules } from './codegen/codegen.js';
export { loadProgram, resolveImportPath, ModuleError } from './modules/resolver.js';
export type { Module, FileReader } from './modules/resolver.js';
export type { Token } from './lexer/token.js';
export type { ASTNode } from './parser/ast.js';
export type { Type } from './types/types.js';

/**
 * Compile a single Jenna source string to JavaScript.
 * Sources with imports must be compiled with compileProject instead.
 */
export function compile(source: string): string {
  const tokens = lexerTokenize(source);
  const ast = parserParse(tokens);

  const importDecl = ast.declarations.find(d => d.kind === 'Import');
  if (importDecl) {
    throw new ModuleError(
      'Imports are only supported when compiling from a file (use compileProject or the jenna CLI)'
    );
  }

  const typedAst = typeInfer(ast);
  const jsCode = codegenGenerate(typedAst);
  return jsCode;
}

/**
 * Compile a Jenna program starting from its entry file, resolving
 * imports into a single bundled JavaScript output.
 */
export function compileProject(entryPath: string, readFile: FileReader): string {
  const modules = loadProgram(entryPath, readFile);
  inferModules(modules);
  return generateModules(modules);
}
