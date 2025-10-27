import {
  Program,
  Declaration,
  Expression,
  LetDeclaration,
  TypeDeclaration,
  LiteralExpr,
  IdentifierExpr,
  BinaryExpr,
  UnaryExpr,
  IfExpr,
  FunctionExpr,
  CallExpr,
  MatchExpr,
  MatchCase,
  ConstructorExpr,
  LetExpr,
  Pattern,
  TypeAnnotation as ASTTypeAnnotation,
} from '../parser/ast.js';
import {
  Type,
  IntType,
  FloatType,
  StringType,
  BoolType,
  FunctionType,
  ADTType,
  freshTypeVar,
  prune,
  resetTypeVarCounter,
} from './types.js';
import { TypeEnvironment } from './environment.js';
import { unify, TypeError } from './unify.js';

/**
 * Type warning (non-fatal)
 */
class TypeWarning {
  constructor(public message: string) {}
}

/**
 * Global warnings array
 */
const warnings: TypeWarning[] = [];

/**
 * Emit a warning to stderr
 */
function warn(message: string): void {
  const warning = new TypeWarning(message);
  warnings.push(warning);
  console.warn(`⚠️  Warning: ${message}`);
}

/**
 * Type parameter substitution map
 */
type TypeSubstitution = Map<string, Type>;

/**
 * Constructor information for the registry
 */
interface ConstructorInfo {
  name: string;
  adtName: string;
  argTypeAnnotations: ASTTypeAnnotation[]; // Store AST annotations
  typeParams: string[];
}

/**
 * Convert AST type annotation to internal Type
 */
function astTypeToType(astType: ASTTypeAnnotation, subst: TypeSubstitution = new Map()): Type {
  if (astType.kind === 'PrimitiveType') {
    switch (astType.name) {
      case 'Int': return IntType;
      case 'Float': return FloatType;
      case 'String': return StringType;
      case 'Bool': return BoolType;
    }
  }

  if (astType.kind === 'FunctionType') {
    const parameters = astType.parameters.map(p => astTypeToType(p, subst));
    const returnType = astTypeToType(astType.returnType, subst);
    return {
      kind: 'Function',
      parameters,
      returnType,
    };
  }

  if (astType.kind === 'TypeVar') {
    // Look up in substitution map
    const substType = subst.get(astType.name);
    if (substType) {
      return substType;
    }
    // Create fresh type variable
    return freshTypeVar();
  }

  if (astType.kind === 'CustomType') {
    const typeArgs = astType.arguments.map(arg => astTypeToType(arg, subst));
    return {
      kind: 'ADT',
      name: astType.name,
      typeArgs,
    };
  }

  throw new TypeError(`Unknown type annotation: ${JSON.stringify(astType)}`);
}

/**
 * Global registry of ADT constructors
 */
const constructorRegistry = new Map<string, ConstructorInfo>();

/**
 * Create a type environment with built-in functions
 */
function createStdlib(): TypeEnvironment {
  const env = new TypeEnvironment();

  // print: (String) -> String
  env.bind('print', {
    kind: 'Function',
    parameters: [StringType],
    returnType: StringType,
  });

  // printInt: (Int) -> Int
  env.bind('printInt', {
    kind: 'Function',
    parameters: [IntType],
    returnType: IntType,
  });

  // printBool: (Bool) -> Bool
  env.bind('printBool', {
    kind: 'Function',
    parameters: [BoolType],
    returnType: BoolType,
  });

  // intToString: (Int) -> String
  env.bind('intToString', {
    kind: 'Function',
    parameters: [IntType],
    returnType: StringType,
  });

  // mod: (Int, Int) -> Int
  env.bind('mod', {
    kind: 'Function',
    parameters: [IntType, IntType],
    returnType: IntType,
  });

  return env;
}

/**
 * Register an ADT and its constructors
 */
function registerADT(decl: TypeDeclaration): void {
  const adtName = decl.name;
  const typeParams = decl.typeParams;

  // Register each variant as a constructor
  for (const variant of decl.variants) {
    const constructorName = variant.name;

    const constructor: ConstructorInfo = {
      name: constructorName,
      adtName,
      argTypeAnnotations: variant.arguments, // Store AST annotations
      typeParams,
    };

    constructorRegistry.set(constructorName, constructor);
  }
}

/**
 * Infer the type of an expression
 */
function inferExpression(expr: Expression, env: TypeEnvironment): Type {
  switch (expr.kind) {
    case 'Literal':
      return inferLiteral(expr);

    case 'Identifier':
      return inferIdentifier(expr, env);

    case 'Binary':
      return inferBinary(expr, env);

    case 'Unary':
      return inferUnary(expr, env);

    case 'If':
      return inferIf(expr, env);

    case 'Function':
      return inferFunction(expr, env);

    case 'Call':
      return inferCall(expr, env);

    case 'Constructor':
      return inferConstructor(expr, env);

    case 'Match':
      return inferMatch(expr, env);

    case 'LetExpr':
      return inferLetExpr(expr, env);

    default:
      throw new TypeError(`Unknown expression kind: ${(expr as any).kind}`);
  }
}

/**
 * Infer the type of a literal
 */
function inferLiteral(expr: LiteralExpr): Type {
  switch (expr.literalType) {
    case 'int':
      return IntType;
    case 'float':
      return FloatType;
    case 'string':
      return StringType;
    case 'boolean':
      return BoolType;
  }
}

/**
 * Infer the type of an identifier
 */
function inferIdentifier(expr: IdentifierExpr, env: TypeEnvironment): Type {
  const type = env.lookup(expr.name);
  if (!type) {
    throw new TypeError(`Undefined variable: ${expr.name}`);
  }
  return type;
}

/**
 * Infer the type of a binary operation
 */
function inferBinary(expr: BinaryExpr, env: TypeEnvironment): Type {
  const leftType = inferExpression(expr.left, env);
  const rightType = inferExpression(expr.right, env);

  // Pipe operator: x |> f
  // leftType: A, rightType: A -> B, result: B
  if (expr.operator === '|>') {
    const resultType = freshTypeVar();
    const expectedFunctionType: FunctionType = {
      kind: 'Function',
      parameters: [leftType],
      returnType: resultType,
    };
    unify(rightType, expectedFunctionType);
    return prune(resultType);
  }

  // Arithmetic operators: +, -, *, /, %
  if (['+', '-', '*', '/', '%'].includes(expr.operator)) {
    unify(leftType, IntType);
    unify(rightType, IntType);
    return IntType;
  }

  // Comparison operators: ==, !=, <, <=, >, >=
  if (['==', '!=', '<', '<=', '>', '>='].includes(expr.operator)) {
    unify(leftType, rightType);
    return BoolType;
  }

  // Logical operators: &&, ||
  if (['&&', '||'].includes(expr.operator)) {
    unify(leftType, BoolType);
    unify(rightType, BoolType);
    return BoolType;
  }

  throw new TypeError(`Unknown binary operator: ${expr.operator}`);
}

/**
 * Infer the type of a unary operation
 */
function inferUnary(expr: UnaryExpr, env: TypeEnvironment): Type {
  const operandType = inferExpression(expr.operand, env);

  if (expr.operator === '!') {
    unify(operandType, BoolType);
    return BoolType;
  }

  if (expr.operator === '-') {
    unify(operandType, IntType);
    return IntType;
  }

  throw new TypeError(`Unknown unary operator: ${expr.operator}`);
}

/**
 * Infer the type of an if expression
 */
function inferIf(expr: IfExpr, env: TypeEnvironment): Type {
  const conditionType = inferExpression(expr.condition, env);
  unify(conditionType, BoolType);

  const thenType = inferExpression(expr.thenBranch, env);
  const elseType = inferExpression(expr.elseBranch, env);

  unify(thenType, elseType);
  return thenType;
}

/**
 * Infer the type of a let expression
 * let x = value in body
 */
function inferLetExpr(expr: LetExpr, env: TypeEnvironment): Type {
  // Infer the type of the value
  const valueType = inferExpression(expr.value, env);

  // Extend environment with the new binding
  const letEnv = env.extend();
  letEnv.bind(expr.name, valueType);

  // Infer the body type in the extended environment
  const bodyType = inferExpression(expr.body, letEnv);

  return bodyType;
}

/**
 * Infer the type of a function
 */
function inferFunction(expr: FunctionExpr, env: TypeEnvironment): Type {
  // Create fresh type variables for parameters
  const paramTypes: Type[] = expr.parameters.map(() => freshTypeVar());

  // Extend environment with parameter bindings
  const fnEnv = env.extend();
  for (let i = 0; i < expr.parameters.length; i++) {
    fnEnv.bind(expr.parameters[i], paramTypes[i]);
  }

  // Infer the body type
  const bodyType = inferExpression(expr.body, fnEnv);

  return {
    kind: 'Function',
    parameters: paramTypes,
    returnType: bodyType,
  };
}

/**
 * Infer the type of a function call
 */
function inferCall(expr: CallExpr, env: TypeEnvironment): Type {
  const calleeType = inferExpression(expr.callee, env);
  const argTypes = expr.arguments.map(arg => inferExpression(arg, env));

  // Create a fresh type variable for the return type
  const returnType = freshTypeVar();

  // Unify the callee type with a function type
  const expectedFnType: FunctionType = {
    kind: 'Function',
    parameters: argTypes,
    returnType,
  };

  unify(calleeType, expectedFnType);

  return prune(returnType);
}

/**
 * Instantiate a constructor type with fresh type variables
 */
function instantiateConstructor(constructor: ConstructorInfo): { argTypes: Type[], returnType: Type } {
  // Create fresh type variables for each type parameter
  const freshTypeArgs = constructor.typeParams.map(() => freshTypeVar());

  // Create substitution map from type parameter names to fresh type variables
  const subst = new Map<string, Type>();
  constructor.typeParams.forEach((param, i) => {
    subst.set(param, freshTypeArgs[i]);
  });

  // Convert AST type annotations to types with the substitution
  const argTypes = constructor.argTypeAnnotations.map(annot => astTypeToType(annot, subst));

  const returnType: ADTType = {
    kind: 'ADT',
    name: constructor.adtName,
    typeArgs: freshTypeArgs,
  };

  return { argTypes, returnType };
}

/**
 * Infer the type of a constructor expression
 */
function inferConstructor(expr: ConstructorExpr, env: TypeEnvironment): Type {
  // Look up constructor from registry (not environment!)
  const constructor = constructorRegistry.get(expr.name);

  if (!constructor) {
    throw new TypeError(`Unknown constructor: ${expr.name}`);
  }

  // Instantiate the constructor with fresh type variables
  const { argTypes, returnType } = instantiateConstructor(constructor);

  // If no arguments, just return the type
  if (expr.arguments.length === 0) {
    return returnType;
  }

  // Infer argument types
  const inferredArgTypes = expr.arguments.map(arg => inferExpression(arg, env));

  // Check arity
  if (inferredArgTypes.length !== argTypes.length) {
    throw new TypeError(
      `Constructor ${expr.name} expects ${argTypes.length} arguments, got ${inferredArgTypes.length}`
    );
  }

  // Unify each argument type
  for (let i = 0; i < argTypes.length; i++) {
    unify(inferredArgTypes[i], argTypes[i]);
  }

  return prune(returnType);
}

/**
 * Infer the type of a match expression
 */
function inferMatch(expr: MatchExpr, env: TypeEnvironment): Type {
  // Infer the type of the matched expression
  const matchedType = inferExpression(expr.expr, env);

  // Infer types for all cases
  const caseTypes: Type[] = [];

  for (const matchCase of expr.cases) {
    // Create new environment for this case with pattern bindings
    const caseEnv = env.extend();

    // Check pattern and add bindings
    inferPattern(matchCase.pattern, matchedType, caseEnv);

    // Infer the body type
    const bodyType = inferExpression(matchCase.body, caseEnv);
    caseTypes.push(bodyType);
  }

  // All cases must have the same type
  const firstType = caseTypes[0];
  for (let i = 1; i < caseTypes.length; i++) {
    unify(firstType, caseTypes[i]);
  }

  // Check exhaustiveness
  checkExhaustiveness(matchedType, expr.cases);

  return prune(firstType);
}

/**
 * Extract constructor names covered by a pattern
 * Returns null if pattern is a catch-all (wildcard or identifier)
 */
function extractCoveredConstructors(pattern: Pattern): Set<string> | null {
  switch (pattern.kind) {
    case 'WildcardPattern':
    case 'IdentifierPattern':
      // These are catch-all patterns
      return null;

    case 'ConstructorPattern':
      // This covers a specific constructor
      return new Set([pattern.constructor]);

    case 'LiteralPattern':
      // Literals don't contribute to ADT exhaustiveness
      return new Set();
  }
}

/**
 * Check if match expression is exhaustive
 */
function checkExhaustiveness(matchedType: Type, cases: MatchCase[]): void {
  const prunedType = prune(matchedType);

  // Only check ADT types
  if (prunedType.kind !== 'ADT') {
    return;
  }

  // Check if any pattern is a catch-all
  for (const matchCase of cases) {
    const covered = extractCoveredConstructors(matchCase.pattern);
    if (covered === null) {
      // Catch-all pattern found, match is exhaustive
      return;
    }
  }

  // Collect all covered constructors
  const coveredConstructors = new Set<string>();
  for (const matchCase of cases) {
    const covered = extractCoveredConstructors(matchCase.pattern);
    if (covered) {
      covered.forEach(c => coveredConstructors.add(c));
    }
  }

  // Get all constructors for this ADT
  const allConstructors = new Set<string>();
  for (const [constructorName, info] of constructorRegistry.entries()) {
    if (info.adtName === prunedType.name) {
      allConstructors.add(constructorName);
    }
  }

  // Find missing constructors
  const missingConstructors: string[] = [];
  for (const constructor of allConstructors) {
    if (!coveredConstructors.has(constructor)) {
      missingConstructors.push(constructor);
    }
  }

  // Emit warning if not exhaustive
  if (missingConstructors.length > 0) {
    const missing = missingConstructors.join(', ');
    warn(`Non-exhaustive pattern match on type ${prunedType.name}. Missing cases: ${missing}`);
  }
}

/**
 * Check a pattern and add bindings to environment
 */
function inferPattern(pattern: Pattern, expectedType: Type, env: TypeEnvironment): void {
  switch (pattern.kind) {
    case 'LiteralPattern':
      // Check literal type matches
      let literalType: Type;
      switch (pattern.literalType) {
        case 'int': literalType = IntType; break;
        case 'float': literalType = FloatType; break;
        case 'string': literalType = StringType; break;
        case 'boolean': literalType = BoolType; break;
      }
      unify(expectedType, literalType);
      break;

    case 'IdentifierPattern':
      // Bind the identifier to the expected type
      env.bind(pattern.name, expectedType);
      break;

    case 'ConstructorPattern':
      // Look up constructor
      const constructor = constructorRegistry.get(pattern.constructor);
      if (!constructor) {
        throw new TypeError(`Unknown constructor in pattern: ${pattern.constructor}`);
      }

      // Instantiate constructor with fresh type variables
      const { argTypes: patternArgTypes, returnType: patternReturnType } = instantiateConstructor(constructor);

      // Unify expected type with the ADT type
      unify(expectedType, patternReturnType);

      // Check pattern arguments
      if (pattern.arguments.length !== patternArgTypes.length) {
        throw new TypeError(
          `Constructor ${pattern.constructor} expects ${patternArgTypes.length} arguments, got ${pattern.arguments.length}`
        );
      }

      // Recursively check sub-patterns
      for (let i = 0; i < pattern.arguments.length; i++) {
        inferPattern(pattern.arguments[i], patternArgTypes[i], env);
      }
      break;

    case 'WildcardPattern':
      // Wildcard matches anything, no bindings
      break;
  }
}

/**
 * Infer types for a declaration
 */
function inferDeclaration(decl: Declaration, env: TypeEnvironment): void {
  if (decl.kind === 'Let') {
    inferLetDeclaration(decl, env);
  } else if (decl.kind === 'Type') {
    registerADT(decl);
  }
}

/**
 * Infer types for a let declaration
 */
function inferLetDeclaration(decl: LetDeclaration, env: TypeEnvironment): void {
  // For recursive functions, we need to add a binding first with a fresh type variable
  // Then infer the type and unify
  const selfType = freshTypeVar();
  env.bind(decl.name, selfType);

  // Infer the type of the value
  const valueType = inferExpression(decl.value, env);

  // Unify the self type with the inferred type
  unify(selfType, valueType);

  // If there's a type annotation, unify with it
  if (decl.typeAnnotation) {
    const annotatedType = astTypeToType(decl.typeAnnotation);
    unify(valueType, annotatedType);
  }

  // Update binding with the pruned type
  env.bind(decl.name, prune(selfType));
}

/**
 * Infer types for a program
 */
export function inferTypes(ast: Program): Program {
  // Reset type variable counter for fresh inference
  resetTypeVarCounter();

  // Create environment with standard library
  const env = createStdlib();

  // Infer types for all declarations
  for (const decl of ast.declarations) {
    try {
      inferDeclaration(decl, env);
    } catch (error) {
      if (error instanceof TypeError) {
        // Add context about which declaration failed
        if (decl.kind === 'Let') {
          throw new TypeError(`In declaration of '${decl.name}': ${error.message}`);
        }
        throw error;
      }
      throw error;
    }
  }

  // Return the AST unchanged (types are inferred but not stored in AST yet)
  return ast;
}
