import { Type, TypeScheme, monotype, instantiate, freeTypeVarsInScheme } from './types.js';

/**
 * Type environment for tracking variable types during inference.
 *
 * Bindings are type schemes: polymorphic bindings (from generalized
 * let declarations) are instantiated with fresh type variables on every
 * lookup, while monomorphic bindings (function parameters, recursive
 * self-references) stay shared so they unify globally.
 */
export class TypeEnvironment {
  private bindings: Map<string, TypeScheme>;
  private parent?: TypeEnvironment;

  constructor(parent?: TypeEnvironment) {
    this.bindings = new Map();
    this.parent = parent;
  }

  /**
   * Look up a variable's type, instantiating its scheme
   */
  lookup(name: string): Type | undefined {
    const scheme = this.lookupScheme(name);
    return scheme ? instantiate(scheme) : undefined;
  }

  /**
   * Look up a variable's scheme without instantiating
   */
  lookupScheme(name: string): TypeScheme | undefined {
    const scheme = this.bindings.get(name);
    if (scheme !== undefined) {
      return scheme;
    }
    if (this.parent) {
      return this.parent.lookupScheme(name);
    }
    return undefined;
  }

  /**
   * Add a monomorphic binding to the environment
   */
  bind(name: string, type: Type): void {
    this.bindings.set(name, monotype(type));
  }

  /**
   * Add a polymorphic binding to the environment
   */
  bindScheme(name: string, scheme: TypeScheme): void {
    this.bindings.set(name, scheme);
  }

  /**
   * Ids of type variables free somewhere in the environment.
   * Generalization must not quantify over these.
   */
  freeTypeVars(): Set<number> {
    const free = new Set<number>();
    let env: TypeEnvironment | undefined = this;
    while (env) {
      for (const scheme of env.bindings.values()) {
        freeTypeVarsInScheme(scheme, free);
      }
      env = env.parent;
    }
    return free;
  }

  /**
   * Create a child environment
   */
  extend(): TypeEnvironment {
    return new TypeEnvironment(this);
  }

  /**
   * Get all bindings (for debugging)
   */
  getBindings(): Map<string, TypeScheme> {
    return new Map(this.bindings);
  }
}
