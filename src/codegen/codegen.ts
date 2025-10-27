import {
  Program,
  Declaration,
  LetDeclaration,
  Expression,
  LiteralExpr,
  IdentifierExpr,
  BinaryExpr,
  UnaryExpr,
  IfExpr,
  FunctionExpr,
  CallExpr,
  ConstructorExpr,
  MatchExpr,
  LetExpr,
  Pattern,
} from '../parser/ast.js';
import { generateRuntimePreamble } from '../stdlib/runtime.js';

/**
 * Code generation context
 */
class CodegenContext {
  private indentLevel: number = 0;
  private indentString: string = '  ';

  /**
   * Get current indentation
   */
  indent(): string {
    return this.indentString.repeat(this.indentLevel);
  }

  /**
   * Increase indentation level
   */
  pushIndent(): void {
    this.indentLevel++;
  }

  /**
   * Decrease indentation level
   */
  popIndent(): void {
    this.indentLevel--;
  }
}

/**
 * Generate JavaScript code from a program
 */
export function generateCode(ast: Program): string {
  const ctx = new CodegenContext();
  const lines: string[] = [];

  // Add runtime preamble
  lines.push(generateRuntimePreamble());

  // Generate code for each declaration
  for (const decl of ast.declarations) {
    const code = generateDeclaration(decl, ctx);
    if (code) {
      lines.push(code);
    }
  }

  return lines.join('\n');
}

/**
 * Generate code for a declaration
 */
function generateDeclaration(decl: Declaration, ctx: CodegenContext): string | null {
  if (decl.kind === 'Let') {
    return generateLetDeclaration(decl, ctx);
  }
  if (decl.kind === 'Type') {
    // Type declarations don't generate code
    return null;
  }
  throw new Error(`Unknown declaration kind: ${(decl as any).kind}`);
}

/**
 * Generate code for a let declaration
 */
function generateLetDeclaration(decl: LetDeclaration, ctx: CodegenContext): string {
  const value = generateExpression(decl.value, ctx);
  return `const ${decl.name} = ${value};`;
}

/**
 * Generate code for an expression
 */
function generateExpression(expr: Expression, ctx: CodegenContext): string {
  switch (expr.kind) {
    case 'Literal':
      return generateLiteral(expr);
    case 'Identifier':
      return generateIdentifier(expr);
    case 'Binary':
      return generateBinary(expr, ctx);
    case 'Unary':
      return generateUnary(expr, ctx);
    case 'If':
      return generateIf(expr, ctx);
    case 'Function':
      return generateFunction(expr, ctx);
    case 'Call':
      return generateCall(expr, ctx);
    case 'Constructor':
      return generateConstructor(expr, ctx);
    case 'Match':
      return generateMatch(expr, ctx);
    case 'LetExpr':
      return generateLetExpr(expr, ctx);
    default:
      throw new Error(`Unknown expression kind: ${(expr as any).kind}`);
  }
}

/**
 * Generate code for a literal
 */
function generateLiteral(expr: LiteralExpr): string {
  if (expr.literalType === 'string') {
    // Escape the string properly
    return JSON.stringify(expr.value);
  }
  return String(expr.value);
}

/**
 * Generate code for an identifier
 */
function generateIdentifier(expr: IdentifierExpr): string {
  return expr.name;
}

/**
 * Generate code for a binary expression
 */
function generateBinary(expr: BinaryExpr, ctx: CodegenContext): string {
  // Handle pipe operator specially: x |> f becomes f(x)
  if (expr.operator === '|>') {
    const left = generateExpression(expr.left, ctx);
    const right = generateExpression(expr.right, ctx);
    return `(${right})(${left})`;
  }

  const left = generateExpression(expr.left, ctx);
  const right = generateExpression(expr.right, ctx);

  // Map Jenna operators to JavaScript operators
  const op = expr.operator;
  return `(${left} ${op} ${right})`;
}

/**
 * Generate code for a unary expression
 */
function generateUnary(expr: UnaryExpr, ctx: CodegenContext): string {
  const operand = generateExpression(expr.operand, ctx);
  return `(${expr.operator}${operand})`;
}

/**
 * Generate code for an if expression
 */
function generateIf(expr: IfExpr, ctx: CodegenContext): string {
  const condition = generateExpression(expr.condition, ctx);
  const thenBranch = generateExpression(expr.thenBranch, ctx);
  const elseBranch = generateExpression(expr.elseBranch, ctx);

  // Use JavaScript ternary operator
  return `(${condition} ? ${thenBranch} : ${elseBranch})`;
}

/**
 * Generate code for a let expression
 * let x = value in body
 * Compiles to: (() => { const x = value; return body; })()
 */
function generateLetExpr(expr: LetExpr, ctx: CodegenContext): string {
  const value = generateExpression(expr.value, ctx);
  const body = generateExpression(expr.body, ctx);

  // Use IIFE to create a scope for the binding
  return `(() => { const ${expr.name} = ${value}; return ${body}; })()`;
}

/**
 * Generate code for a function
 */
function generateFunction(expr: FunctionExpr, ctx: CodegenContext): string {
  const params = expr.parameters.join(', ');
  const body = generateExpression(expr.body, ctx);

  // Use arrow function syntax
  return `(${params}) => ${body}`;
}

/**
 * Generate code for a function call
 */
function generateCall(expr: CallExpr, ctx: CodegenContext): string {
  const callee = generateExpression(expr.callee, ctx);
  const args = expr.arguments.map(arg => generateExpression(arg, ctx)).join(', ');

  return `${callee}(${args})`;
}

/**
 * Generate code for a constructor
 * Constructors become JavaScript objects with a __tag property
 */
function generateConstructor(expr: ConstructorExpr, ctx: CodegenContext): string {
  if (expr.arguments.length === 0) {
    // Nullary constructor - just an object with a tag
    return `{ __tag: "${expr.name}" }`;
  }

  // Constructor with arguments
  const args = expr.arguments.map(arg => generateExpression(arg, ctx));
  const fields = args.map((arg, i) => `_${i}: ${arg}`).join(', ');

  return `{ __tag: "${expr.name}", ${fields} }`;
}

/**
 * Generate code for a match expression
 * Match becomes a JavaScript expression with conditional checks
 */
function generateMatch(expr: MatchExpr, ctx: CodegenContext): string {
  const matchedExpr = generateExpression(expr.expr, ctx);

  // Generate a temp variable for the matched expression
  const tempVar = `__match_${Math.random().toString(36).substr(2, 9)}`;

  // Build nested ternary expressions
  let result = '(() => { ';
  result += `const ${tempVar} = ${matchedExpr}; `;
  result += 'return ';

  const generateCaseCheck = (caseIndex: number): string => {
    if (caseIndex >= expr.cases.length) {
      // No more cases - this shouldn't happen if exhaustiveness check is implemented
      return 'undefined';
    }

    const matchCase = expr.cases[caseIndex];
    const { pattern, body } = matchCase;

    // Generate pattern check and body
    const check = generatePatternCheck(pattern, tempVar);
    const bindings = generatePatternBindings(pattern, tempVar);

    const bodyCode = generateExpression(body, ctx);

    // If this is the last case or pattern is wildcard, just return body
    if (caseIndex === expr.cases.length - 1 || pattern.kind === 'WildcardPattern') {
      if (bindings.length > 0) {
        return `(() => { ${bindings.join('; ')}; return ${bodyCode}; })()`;
      }
      return bodyCode;
    }

    // Otherwise, check condition and recursively generate next case
    const nextCase = generateCaseCheck(caseIndex + 1);

    if (bindings.length > 0) {
      return `(${check} ? (() => { ${bindings.join('; ')}; return ${bodyCode}; })() : ${nextCase})`;
    }

    return `(${check} ? ${bodyCode} : ${nextCase})`;
  };

  result += generateCaseCheck(0);
  result += '; })()';

  return result;
}

/**
 * Generate a check for whether a pattern matches
 */
function generatePatternCheck(pattern: Pattern, valueExpr: string): string {
  switch (pattern.kind) {
    case 'LiteralPattern':
      return `${valueExpr} === ${JSON.stringify(pattern.value)}`;

    case 'IdentifierPattern':
      // Identifier always matches
      return 'true';

    case 'ConstructorPattern':
      if (pattern.arguments.length === 0) {
        // Nullary constructor - just check tag
        return `${valueExpr}.__tag === "${pattern.constructor}"`;
      }

      // Constructor with arguments - check tag and recursively check arguments
      const checks = [`${valueExpr}.__tag === "${pattern.constructor}"`];
      pattern.arguments.forEach((argPattern, i) => {
        checks.push(generatePatternCheck(argPattern, `${valueExpr}._${i}`));
      });
      return checks.join(' && ');

    case 'WildcardPattern':
      return 'true';
  }
}

/**
 * Generate variable bindings for a pattern
 */
function generatePatternBindings(pattern: Pattern, valueExpr: string): string[] {
  const bindings: string[] = [];

  switch (pattern.kind) {
    case 'IdentifierPattern':
      bindings.push(`const ${pattern.name} = ${valueExpr}`);
      break;

    case 'ConstructorPattern':
      pattern.arguments.forEach((argPattern, i) => {
        bindings.push(...generatePatternBindings(argPattern, `${valueExpr}._${i}`));
      });
      break;

    // Literal and Wildcard don't create bindings
  }

  return bindings;
}
