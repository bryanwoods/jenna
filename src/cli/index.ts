#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { compile } from '../index.js';
import { startRepl } from './repl.js';

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
Jenna - A statically-typed functional language that compiles to JavaScript

Usage:
  jenna repl                              Start an interactive REPL
  jenna compile <input.jn> [output.js]    Compile a Jenna file to JavaScript
  jenna run <input.jn>                    Compile and run a Jenna file
  jenna --help                            Show this help message
  jenna --version                         Show version

Examples:
  jenna repl                              Start interactive mode
  jenna compile hello.jn                  Compile hello.jn to hello.js
  jenna compile hello.jn output.js        Compile hello.jn to output.js
  jenna run factorial.jn                  Compile and execute factorial.jn
`);
}

/**
 * Print version information
 */
function printVersion(): void {
  console.log('Jenna v0.2.0');
}

/**
 * Read a file
 */
function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error: Could not read file '${filePath}'`);
    process.exit(1);
  }
}

/**
 * Write a file
 */
function writeFile(filePath: string, content: string): void {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`Error: Could not write file '${filePath}'`);
    process.exit(1);
  }
}

/**
 * Compile command
 */
function compileCommand(inputPath: string, outputPath?: string): void {
  // Read source file
  const source = readFile(inputPath);

  // Compile
  let jsCode: string;
  try {
    jsCode = compile(source);
  } catch (error) {
    console.error('Compilation failed:');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }

  // Determine output path
  if (!outputPath) {
    const baseName = path.basename(inputPath, path.extname(inputPath));
    outputPath = path.join(path.dirname(inputPath), `${baseName}.js`);
  }

  // Write output file
  writeFile(outputPath, jsCode);

  console.log(`Compiled ${inputPath} -> ${outputPath}`);
}

/**
 * Run command
 */
function runCommand(inputPath: string): void {
  // Read source file
  const source = readFile(inputPath);

  // Compile
  let jsCode: string;
  try {
    jsCode = compile(source);
  } catch (error) {
    console.error('Compilation failed:');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }

  // Execute
  try {
    // Use Function constructor to execute in a clean scope
    const fn = new Function(jsCode);
    fn();
  } catch (error) {
    console.error('Runtime error:');
    if (error instanceof Error) {
      console.error(error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }
}

/**
 * Main CLI entry point
 */
function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    return;
  }

  if (args[0] === '--version' || args[0] === '-v') {
    printVersion();
    return;
  }

  const command = args[0];

  if (command === 'repl') {
    startRepl();
  } else if (command === 'compile') {
    if (args.length < 2) {
      console.error('Error: compile command requires an input file');
      printUsage();
      process.exit(1);
    }

    const inputPath = args[1];
    const outputPath = args[2];
    compileCommand(inputPath, outputPath);
  } else if (command === 'run') {
    if (args.length < 2) {
      console.error('Error: run command requires an input file');
      printUsage();
      process.exit(1);
    }

    const inputPath = args[1];
    runCommand(inputPath);
  } else {
    console.error(`Error: Unknown command '${command}'`);
    printUsage();
    process.exit(1);
  }
}

main();
