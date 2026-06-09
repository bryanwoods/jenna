// Main compiler API
import { tokenize as lexerTokenize } from './lexer/lexer.js';
import { parse as parserParse } from './parser/parser.js';
import { inferTypes as typeInfer } from './types/infer.js';
import { generateCode as codegenGenerate } from './codegen/codegen.js';

export { tokenize, LexError } from './lexer/lexer.js';
export { formatError } from './diagnostics.js';
export { parse } from './parser/parser.js';
export { inferTypes } from './types/infer.js';
export { generateCode } from './codegen/codegen.js';
export type { Token } from './lexer/token.js';
export type { ASTNode } from './parser/ast.js';
export type { Type } from './types/types.js';

/**
 * Compile Jenna source code to JavaScript
 */
export function compile(source: string): string {
  const tokens = lexerTokenize(source);
  const ast = parserParse(tokens);
  const typedAst = typeInfer(ast);
  const jsCode = codegenGenerate(typedAst);
  return jsCode;
}
