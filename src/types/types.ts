/**
 * Type system for Jenna
 */

export type Type =
  | PrimitiveType
  | FunctionType
  | TypeVariable
  | ADTType;

export interface PrimitiveType {
  kind: 'Primitive';
  name: 'Int' | 'Float' | 'String' | 'Bool';
}

export interface FunctionType {
  kind: 'Function';
  parameters: Type[];
  returnType: Type;
}

export interface TypeVariable {
  kind: 'TypeVariable';
  id: number;
  instance?: Type; // For unification
  /** Constrained to Int or Float (set by arithmetic on unresolved operands) */
  numeric?: boolean;
}

export interface ADTType {
  kind: 'ADT';
  name: string;
  typeArgs: Type[];
}

/**
 * Type constructor information
 */
export interface TypeConstructor {
  name: string;
  adtName: string;
  argTypes: Type[];
  typeParams: string[];
}

/**
 * Type variable counter for generating unique type variables
 */
let typeVarCounter = 0;

/**
 * Reset the type variable counter (useful for testing)
 */
export function resetTypeVarCounter(): void {
  typeVarCounter = 0;
}

/**
 * Create a fresh type variable
 */
export function freshTypeVar(): TypeVariable {
  return {
    kind: 'TypeVariable',
    id: typeVarCounter++,
  };
}

/**
 * Check if two types are equal
 */
export function typeEquals(t1: Type, t2: Type): boolean {
  t1 = prune(t1);
  t2 = prune(t2);

  if (t1.kind === 'Primitive' && t2.kind === 'Primitive') {
    return t1.name === t2.name;
  }

  if (t1.kind === 'TypeVariable' && t2.kind === 'TypeVariable') {
    return t1.id === t2.id;
  }

  if (t1.kind === 'Function' && t2.kind === 'Function') {
    if (t1.parameters.length !== t2.parameters.length) {
      return false;
    }
    for (let i = 0; i < t1.parameters.length; i++) {
      if (!typeEquals(t1.parameters[i], t2.parameters[i])) {
        return false;
      }
    }
    return typeEquals(t1.returnType, t2.returnType);
  }

  if (t1.kind === 'ADT' && t2.kind === 'ADT') {
    if (t1.name !== t2.name) {
      return false;
    }
    if (t1.typeArgs.length !== t2.typeArgs.length) {
      return false;
    }
    for (let i = 0; i < t1.typeArgs.length; i++) {
      if (!typeEquals(t1.typeArgs[i], t2.typeArgs[i])) {
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Follow the chain of type variable instances
 */
export function prune(type: Type): Type {
  if (type.kind === 'TypeVariable' && type.instance) {
    type.instance = prune(type.instance);
    return type.instance;
  }
  return type;
}

/**
 * Check if a type variable occurs in a type (prevents infinite types)
 */
export function occursInType(v: TypeVariable, type: Type): boolean {
  type = prune(type);

  if (type.kind === 'TypeVariable') {
    return type.id === v.id;
  }

  if (type.kind === 'Function') {
    return (
      type.parameters.some(param => occursInType(v, param)) ||
      occursInType(v, type.returnType)
    );
  }

  if (type.kind === 'ADT') {
    return type.typeArgs.some(arg => occursInType(v, arg));
  }

  return false;
}

/**
 * Convert a type to a human-readable string
 */
export function typeToString(type: Type): string {
  type = prune(type);

  if (type.kind === 'Primitive') {
    return type.name;
  }

  if (type.kind === 'TypeVariable') {
    return `t${type.id}`;
  }

  if (type.kind === 'Function') {
    const params = type.parameters.map(typeToString).join(', ');
    const ret = typeToString(type.returnType);
    return `(${params}) -> ${ret}`;
  }

  if (type.kind === 'ADT') {
    if (type.typeArgs.length === 0) {
      return type.name;
    }
    const args = type.typeArgs.map(typeToString).join(' ');
    return `${type.name} ${args}`;
  }

  return 'unknown';
}

/**
 * Create primitive types
 */
export const IntType: PrimitiveType = { kind: 'Primitive', name: 'Int' };
export const FloatType: PrimitiveType = { kind: 'Primitive', name: 'Float' };
export const StringType: PrimitiveType = { kind: 'Primitive', name: 'String' };
export const BoolType: PrimitiveType = { kind: 'Primitive', name: 'Bool' };

/**
 * A polymorphic type scheme: a type together with the set of type
 * variable ids that are universally quantified (generic).
 *
 * Monotypes are schemes with an empty quantifier set.
 */
export interface TypeScheme {
  quantified: Set<number>;
  type: Type;
}

/**
 * Wrap a type as a monomorphic scheme
 */
export function monotype(type: Type): TypeScheme {
  return { quantified: new Set(), type };
}

/**
 * Collect the ids of unbound type variables appearing in a type
 */
export function freeTypeVars(type: Type, into: Set<number> = new Set()): Set<number> {
  type = prune(type);

  if (type.kind === 'TypeVariable') {
    into.add(type.id);
  } else if (type.kind === 'Function') {
    for (const param of type.parameters) {
      freeTypeVars(param, into);
    }
    freeTypeVars(type.returnType, into);
  } else if (type.kind === 'ADT') {
    for (const arg of type.typeArgs) {
      freeTypeVars(arg, into);
    }
  }

  return into;
}

/**
 * Free type variables of a scheme: those in the type minus the quantified
 */
export function freeTypeVarsInScheme(scheme: TypeScheme, into: Set<number> = new Set()): Set<number> {
  for (const id of freeTypeVars(scheme.type)) {
    if (!scheme.quantified.has(id)) {
      into.add(id);
    }
  }
  return into;
}

/**
 * Instantiate a scheme: copy the type with fresh variables substituted
 * for the quantified ones. Non-quantified variables stay shared so they
 * unify globally.
 */
export function instantiate(scheme: TypeScheme): Type {
  if (scheme.quantified.size === 0) {
    return scheme.type;
  }

  const replacements = new Map<number, TypeVariable>();

  const copy = (t: Type): Type => {
    t = prune(t);

    if (t.kind === 'TypeVariable') {
      if (!scheme.quantified.has(t.id)) {
        return t;
      }
      let fresh = replacements.get(t.id);
      if (!fresh) {
        fresh = freshTypeVar();
        fresh.numeric = t.numeric; // constraints survive instantiation
        replacements.set(t.id, fresh);
      }
      return fresh;
    }

    if (t.kind === 'Function') {
      return {
        kind: 'Function',
        parameters: t.parameters.map(copy),
        returnType: copy(t.returnType),
      };
    }

    if (t.kind === 'ADT') {
      return {
        kind: 'ADT',
        name: t.name,
        typeArgs: t.typeArgs.map(copy),
      };
    }

    return t; // Primitive
  };

  return copy(scheme.type);
}

/**
 * Generalize a type into a scheme, quantifying every free type variable
 * that is not also free in the environment (envFreeVars).
 */
export function generalize(type: Type, envFreeVars: Set<number>): TypeScheme {
  const quantified = new Set<number>();
  for (const id of freeTypeVars(type)) {
    if (!envFreeVars.has(id)) {
      quantified.add(id);
    }
  }
  return { quantified, type };
}
