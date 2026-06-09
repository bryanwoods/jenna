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
  ImportDeclaration,
} from '../parser/ast.js';
import { SourceLocation } from '../lexer/token.js';
import {
  Type,
  TypeScheme,
  IntType,
  FloatType,
  StringType,
  BoolType,
  FunctionType,
  ADTType,
  freshTypeVar,
  prune,
  generalize,
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
export interface ConstructorInfo {
  name: string;
  adtName: string;
  argTypeAnnotations: ASTTypeAnnotation[]; // Store AST annotations
  typeParams: string[];
}

/**
 * Convert AST type annotation to internal Type
 *
 * Pass validate=false for annotations already validated in their home
 * module (imported constructors may reference types that are private
 * to the exporting module).
 */
function astTypeToType(
  astType: ASTTypeAnnotation,
  subst: TypeSubstitution = new Map(),
  validate: boolean = true
): Type {
  if (astType.kind === 'PrimitiveType') {
    switch (astType.name) {
      case 'Int': return IntType;
      case 'Float': return FloatType;
      case 'String': return StringType;
      case 'Bool': return BoolType;
    }
  }

  if (astType.kind === 'FunctionType') {
    const parameters = astType.parameters.map(p => astTypeToType(p, subst, validate));
    const returnType = astTypeToType(astType.returnType, subst, validate);
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
    if (validate) {
      const adt = adtRegistry.get(astType.name);
      if (!adt) {
        throw new TypeError(`Unknown type: ${astType.name}`, astType.location);
      }
      if (astType.arguments.length !== adt.typeParams.length) {
        throw new TypeError(
          `Type ${astType.name} expects ${adt.typeParams.length} type argument(s), got ${astType.arguments.length}`,
          astType.location
        );
      }
    }
    const typeArgs = astType.arguments.map(arg => astTypeToType(arg, subst, validate));
    return {
      kind: 'ADT',
      name: astType.name,
      typeArgs,
    };
  }

  throw new TypeError(`Unknown type annotation: ${JSON.stringify(astType)}`);
}

/**
 * Information about a declared (or imported) ADT
 */
interface ADTInfo {
  typeParams: string[];
  /** Module path the type was declared in, for collision reporting */
  origin?: string;
}

/**
 * Registry of ADT constructors visible to the module being checked.
 * Reassigned per module so each module sees only its own and imported types.
 */
let constructorRegistry = new Map<string, ConstructorInfo>();

/**
 * Registry of ADTs visible to the module being checked
 */
let adtRegistry = new Map<string, ADTInfo>();

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

  // concat: (String, String) -> String
  env.bind('concat', {
    kind: 'Function',
    parameters: [StringType, StringType],
    returnType: StringType,
  });

  // stringLength: (String) -> Int
  env.bind('stringLength', {
    kind: 'Function',
    parameters: [StringType],
    returnType: IntType,
  });

  return env;
}

/**
 * Register an ADT and its constructors
 */
function registerADT(decl: TypeDeclaration, origin?: string): void {
  const adtName = decl.name;
  const typeParams = decl.typeParams;

  const existing = adtRegistry.get(adtName);
  if (existing && existing.origin !== origin) {
    throw new TypeError(
      `Type ${adtName} conflicts with an imported type of the same name`,
      decl.location
    );
  }

  adtRegistry.set(adtName, { typeParams, origin });

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

  // Eagerly validate variant annotations so errors point at the
  // declaration, and so imported constructors never need re-validation
  // in modules where their referenced types are not in scope
  const subst = new Map<string, Type>();
  for (const param of typeParams) {
    subst.set(param, freshTypeVar());
  }
  for (const variant of decl.variants) {
    for (const annotation of variant.arguments) {
      astTypeToType(annotation, subst);
    }
  }
}

/**
 * Infer the type of an expression
 *
 * Wraps the actual inference so that any type error bubbling up gets
 * tagged with the location of the innermost expression that caused it.
 */
function inferExpression(expr: Expression, env: TypeEnvironment): Type {
  try {
    return inferExpressionInner(expr, env);
  } catch (error) {
    if (error instanceof TypeError && !error.location && expr.location) {
      error.location = expr.location;
    }
    throw error;
  }
}

function inferExpressionInner(expr: Expression, env: TypeEnvironment): Type {
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
    throw new TypeError(`Undefined variable: ${expr.name}`, expr.location);
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

  // Extend environment with the new binding, generalized so the
  // binding can be used polymorphically in the body
  const letEnv = env.extend();
  letEnv.bindScheme(expr.name, generalize(prune(valueType), env.freeTypeVars()));

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

  // Convert AST type annotations to types with the substitution.
  // No validation: annotations were validated when the ADT was declared,
  // and may reference types private to the declaring module.
  const argTypes = constructor.argTypeAnnotations.map(annot => astTypeToType(annot, subst, false));

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
    throw new TypeError(`Unknown constructor: ${expr.name}`, expr.location);
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
      `Constructor ${expr.name} expects ${argTypes.length} arguments, got ${inferredArgTypes.length}`,
      expr.location
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
  checkExhaustiveness(matchedType, expr.cases, expr.location);

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
function checkExhaustiveness(
  matchedType: Type,
  cases: MatchCase[],
  location?: { line: number; column: number }
): void {
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
    const where = location ? ` (line ${location.line})` : '';
    warn(`Non-exhaustive pattern match on type ${prunedType.name}${where}. Missing cases: ${missing}`);
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
        throw new TypeError(`Unknown constructor in pattern: ${pattern.constructor}`, pattern.location);
      }

      // Instantiate constructor with fresh type variables
      const { argTypes: patternArgTypes, returnType: patternReturnType } = instantiateConstructor(constructor);

      // Unify expected type with the ADT type
      unify(expectedType, patternReturnType);

      // Check pattern arguments
      if (pattern.arguments.length !== patternArgTypes.length) {
        throw new TypeError(
          `Constructor ${pattern.constructor} expects ${patternArgTypes.length} arguments, got ${pattern.arguments.length}`,
          pattern.location
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
function inferDeclaration(decl: Declaration, env: TypeEnvironment, origin?: string): void {
  if (decl.kind === 'Let') {
    inferLetDeclaration(decl, env);
  } else if (decl.kind === 'Type') {
    registerADT(decl, origin);
  }
  // Imports are bound before declarations are checked; nothing to do here
}

/**
 * Infer types for a let declaration
 */
function inferLetDeclaration(decl: LetDeclaration, env: TypeEnvironment): void {
  // For recursive functions, bind the name to a fresh type variable
  // while inferring its own body (monomorphic recursion). The binding
  // lives in a child env so it doesn't pollute generalization below.
  const selfType = freshTypeVar();
  const bodyEnv = env.extend();
  bodyEnv.bind(decl.name, selfType);

  // Infer the type of the value
  const valueType = inferExpression(decl.value, bodyEnv);

  // Unify the self type with the inferred type
  unify(selfType, valueType);

  // If there's a type annotation, unify with it
  if (decl.typeAnnotation) {
    const annotatedType = astTypeToType(decl.typeAnnotation);
    try {
      unify(valueType, annotatedType);
    } catch (error) {
      if (error instanceof TypeError && !error.location) {
        error.location = decl.value.location ?? decl.location;
      }
      throw error;
    }
  }

  // Generalize over type variables not free elsewhere in the
  // environment, making the binding polymorphic at use sites
  env.bindScheme(decl.name, generalize(prune(selfType), env.freeTypeVars()));
}

/**
 * Check all declarations of one program/module against an environment
 */
function checkDeclarations(declarations: Declaration[], env: TypeEnvironment, origin?: string): void {
  for (const decl of declarations) {
    try {
      inferDeclaration(decl, env, origin);
    } catch (error) {
      if (error instanceof TypeError) {
        // Add context about which declaration failed, keeping the most
        // specific location we have
        if (decl.kind === 'Let') {
          throw new TypeError(
            `In declaration of '${decl.name}': ${error.message}`,
            error.location ?? decl.location
          );
        }
        throw error;
      }
      throw error;
    }
  }
}

/**
 * Infer types for a single-file program
 */
export function inferTypes(ast: Program): Program {
  // Reset type variable counter for fresh inference
  resetTypeVarCounter();

  // Reset per-program state so ADTs from a previous compile don't leak in
  constructorRegistry = new Map();
  adtRegistry = new Map();
  warnings.length = 0;

  // Create environment with standard library
  const env = createStdlib();

  checkDeclarations(ast.declarations, env);

  // Return the AST unchanged (types are inferred but not stored in AST yet)
  return ast;
}

/**
 * What a module makes available to its importers
 */
export interface ModuleExports {
  values: Map<string, TypeScheme>;
  types: Map<string, { typeParams: string[]; constructors: ConstructorInfo[] }>;
}

/**
 * Bind one imported name into the current module's environment/registries
 */
function bindImport(
  imported: { name: string; location?: SourceLocation },
  importPath: string,
  resolvedPath: string,
  moduleExports: ModuleExports,
  env: TypeEnvironment
): void {
  const { name, location } = imported;
  const isTypeName = name[0] === name[0].toUpperCase();

  if (isTypeName) {
    const typeExport = moduleExports.types.get(name);
    if (!typeExport) {
      // Helpful hint when someone imports a constructor instead of its type
      for (const [typeName, t] of moduleExports.types) {
        if (t.constructors.some(c => c.name === name)) {
          throw new TypeError(
            `'${name}' is a constructor; import its type '${typeName}' instead (constructors come with the type)`,
            location
          );
        }
      }
      throw new TypeError(`Module '${importPath}' has no exported type '${name}'`, location);
    }

    const existing = adtRegistry.get(name);
    if (existing && existing.origin !== resolvedPath) {
      throw new TypeError(`Imported type ${name} conflicts with another type of the same name`, location);
    }

    adtRegistry.set(name, { typeParams: typeExport.typeParams, origin: resolvedPath });
    for (const constructor of typeExport.constructors) {
      constructorRegistry.set(constructor.name, constructor);
    }
  } else {
    const valueScheme = moduleExports.values.get(name);
    if (!valueScheme) {
      throw new TypeError(`Module '${importPath}' has no exported value '${name}'`, location);
    }
    env.bindScheme(name, valueScheme);
  }
}

/**
 * Infer types across a whole program of modules.
 *
 * Modules must be in dependency order (as produced by loadProgram).
 * Each module is checked with its own environment and type registries,
 * seeded from the standard library and its imports — so non-exported
 * names are invisible to importers.
 */
export function inferModules(
  modules: Array<{
    path: string;
    ast: Program;
    imports: Array<{ declaration: ImportDeclaration; resolvedPath: string }>;
  }>
): Map<string, ModuleExports> {
  resetTypeVarCounter();
  warnings.length = 0;

  const exportsByPath = new Map<string, ModuleExports>();

  for (const module of modules) {
    constructorRegistry = new Map();
    adtRegistry = new Map();
    const env = createStdlib();

    try {
      // Bind imports first so declarations can use them
      for (const imp of module.imports) {
        const dependencyExports = exportsByPath.get(imp.resolvedPath);
        if (!dependencyExports) {
          throw new TypeError(
            `Internal error: module '${imp.declaration.path}' was not checked before its importer`
          );
        }
        for (const imported of imp.declaration.names) {
          bindImport(imported, imp.declaration.path, imp.resolvedPath, dependencyExports, env);
        }
      }

      checkDeclarations(module.ast.declarations, env, module.path);
    } catch (error) {
      // Tag the error with the module it came from so diagnostics can
      // show the right source file
      if (error instanceof Error && !('modulePath' in error)) {
        (error as Error & { modulePath: string }).modulePath = module.path;
      }
      throw error;
    }

    // Record this module's exports for its importers
    const values = new Map<string, TypeScheme>();
    const types = new Map<string, { typeParams: string[]; constructors: ConstructorInfo[] }>();
    for (const decl of module.ast.declarations) {
      if (decl.kind === 'Let' && decl.exported) {
        values.set(decl.name, env.lookupScheme(decl.name)!);
      } else if (decl.kind === 'Type' && decl.exported) {
        const constructors = decl.variants
          .map(v => constructorRegistry.get(v.name))
          .filter((c): c is ConstructorInfo => c !== undefined);
        types.set(decl.name, { typeParams: decl.typeParams, constructors });
      }
    }
    exportsByPath.set(module.path, { values, types });
  }

  return exportsByPath;
}
