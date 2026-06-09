/**
 * Jenna runtime library
 *
 * This module provides built-in functions that are available to all Jenna programs.
 */

/**
 * Print a string to console and return it
 */
export function print(s: string): string {
  console.log(s);
  return s;
}

/**
 * Print an integer to console and return it
 */
export function printInt(n: number): number {
  console.log(n);
  return n;
}

/**
 * Print a boolean to console and return it
 */
export function printBool(b: boolean): boolean {
  console.log(b);
  return b;
}

/**
 * Convert an integer to a string
 */
export function intToString(n: number): string {
  return n.toString();
}

/**
 * Print a float to console and return it
 */
export function printFloat(n: number): number {
  console.log(n);
  return n;
}

/**
 * Convert a float to a string
 */
export function floatToString(n: number): string {
  return n.toString();
}

/**
 * Modulo operation
 */
export function mod(a: number, b: number): number {
  return a % b;
}

/**
 * Concatenate two strings
 */
export function concat(a: string, b: string): string {
  return a + b;
}

/**
 * Length of a string in characters
 */
export function stringLength(s: string): number {
  return s.length;
}

/**
 * Generate the runtime preamble to be included in compiled code
 */
export function generateRuntimePreamble(): string {
  return `// Jenna Runtime Library
const print = (s) => { console.log(s); return s; };
const printInt = (n) => { console.log(n); return n; };
const printBool = (b) => { console.log(b); return b; };
const intToString = (n) => n.toString();
const printFloat = (n) => { console.log(n); return n; };
const floatToString = (n) => n.toString();
const mod = (a, b) => a % b;
const concat = (a, b) => a + b;
const stringLength = (s) => s.length;

`;
}
