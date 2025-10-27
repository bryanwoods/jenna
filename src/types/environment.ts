import { Type } from './types.js';

/**
 * Type environment for tracking variable types during inference
 */
export class TypeEnvironment {
  private bindings: Map<string, Type>;
  private parent?: TypeEnvironment;

  constructor(parent?: TypeEnvironment) {
    this.bindings = new Map();
    this.parent = parent;
  }

  /**
   * Look up a variable's type in the environment
   */
  lookup(name: string): Type | undefined {
    const type = this.bindings.get(name);
    if (type !== undefined) {
      return type;
    }
    if (this.parent) {
      return this.parent.lookup(name);
    }
    return undefined;
  }

  /**
   * Add a binding to the environment
   */
  bind(name: string, type: Type): void {
    this.bindings.set(name, type);
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
  getBindings(): Map<string, Type> {
    return new Map(this.bindings);
  }
}
