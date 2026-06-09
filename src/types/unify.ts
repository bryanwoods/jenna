import { Type, TypeVariable, prune, occursInType, typeToString } from './types.js';
import { SourceLocation } from '../lexer/token.js';

/**
 * Type error during unification
 */
export class TypeError extends Error {
  constructor(
    message: string,
    public location?: SourceLocation
  ) {
    super(message);
    this.name = 'TypeError';
  }
}

/**
 * Unify two types
 * This is the core of the Hindley-Milner type inference algorithm
 */
export function unify(t1: Type, t2: Type): void {
  t1 = prune(t1);
  t2 = prune(t2);

  // Both are type variables
  if (t1.kind === 'TypeVariable' && t2.kind === 'TypeVariable') {
    if (t1.id !== t2.id) {
      t1.instance = t2;
    }
    return;
  }

  // t1 is a type variable
  if (t1.kind === 'TypeVariable') {
    unifyVariable(t1, t2);
    return;
  }

  // t2 is a type variable
  if (t2.kind === 'TypeVariable') {
    unifyVariable(t2, t1);
    return;
  }

  // Both are primitives
  if (t1.kind === 'Primitive' && t2.kind === 'Primitive') {
    if (t1.name !== t2.name) {
      throw new TypeError(
        `Type mismatch: cannot unify ${typeToString(t1)} with ${typeToString(t2)}`
      );
    }
    return;
  }

  // Both are functions
  if (t1.kind === 'Function' && t2.kind === 'Function') {
    if (t1.parameters.length !== t2.parameters.length) {
      throw new TypeError(
        `Function arity mismatch: ${t1.parameters.length} vs ${t2.parameters.length}`
      );
    }

    // Unify each parameter
    for (let i = 0; i < t1.parameters.length; i++) {
      unify(t1.parameters[i], t2.parameters[i]);
    }

    // Unify return types
    unify(t1.returnType, t2.returnType);
    return;
  }

  // Both are ADTs
  if (t1.kind === 'ADT' && t2.kind === 'ADT') {
    if (t1.name !== t2.name) {
      throw new TypeError(
        `Type mismatch: cannot unify ${typeToString(t1)} with ${typeToString(t2)}`
      );
    }

    if (t1.typeArgs.length !== t2.typeArgs.length) {
      throw new TypeError(
        `Type argument mismatch for ${t1.name}: ${t1.typeArgs.length} vs ${t2.typeArgs.length}`
      );
    }

    // Unify each type argument
    for (let i = 0; i < t1.typeArgs.length; i++) {
      unify(t1.typeArgs[i], t2.typeArgs[i]);
    }
    return;
  }

  // Otherwise, types don't match
  throw new TypeError(
    `Type mismatch: cannot unify ${typeToString(t1)} with ${typeToString(t2)}`
  );
}

/**
 * Unify a type variable with another type
 */
function unifyVariable(v: TypeVariable, t: Type): void {
  if (occursInType(v, t)) {
    throw new TypeError(
      `Infinite type: ${typeToString(v)} occurs in ${typeToString(t)}`
    );
  }
  v.instance = t;
}
