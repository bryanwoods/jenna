import * as readline from 'readline';
import { compile } from '../index.js';

/**
 * REPL for Jenna
 * Provides an interactive environment for evaluating Jenna expressions
 */
export function startRepl(): void {
  console.log('Jenna REPL v0.2.0');
  console.log('Type expressions to evaluate them. Use Ctrl+C or Ctrl+D to exit.');
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  // Track accumulated input for multi-line expressions
  let buffer = '';
  let bracketDepth = 0;
  let parenDepth = 0;
  let matchDepth = 0;

  // Track all declarations from previous evaluations
  let declarations: string[] = [];

  const processLine = (line: string) => {
    // Check if we're building a multi-line expression
    buffer += (buffer ? '\n' : '') + line;

    // Count brackets, parens, and match/end blocks
    const tokens = line.split(/\b/);
    for (const token of tokens) {
      if (token === 'match') {
        matchDepth++;
      } else if (token === 'end') {
        matchDepth--;
      }
    }

    for (const char of line) {
      if (char === '(') {
        parenDepth++;
      } else if (char === ')') {
        parenDepth--;
      }
    }

    // Check for incomplete expression indicators
    const trimmed = line.trim();

    // Check if we're inside a match block
    const inMatchBlock = matchDepth > 0;

    // Check if line ends with a continuation indicator
    const endsWithContinuation =
      trimmed.endsWith('->') ||
      trimmed.endsWith('then') ||
      trimmed.endsWith('else') ||
      trimmed.endsWith('with') ||
      trimmed.endsWith('=') ||
      trimmed === 'let';

    const isIncomplete =
      bracketDepth > 0 ||
      parenDepth > 0 ||
      inMatchBlock ||
      endsWithContinuation;

    if (isIncomplete) {
      // Continue reading multi-line input
      rl.setPrompt('... ');
      rl.prompt();
      return;
    }

    // We have a complete expression, evaluate it
    evaluateExpression(buffer);

    // Reset state
    buffer = '';
    bracketDepth = 0;
    parenDepth = 0;
    matchDepth = 0;
    rl.setPrompt('> ');
    rl.prompt();
  };

  const evaluateExpression = (source: string) => {
    const trimmed = source.trim();

    if (!trimmed) {
      return;
    }

    if (trimmed.startsWith('import')) {
      console.error('Error: imports are not supported in the REPL (run a file with `jenna run` instead)');
      return;
    }

    try {
      // Check if this is a declaration to save
      const isLetDeclaration = trimmed.startsWith('let ') && !trimmed.includes(' in ');
      const isTypeDeclaration = trimmed.startsWith('type ');

      // Build the full source with all previous declarations
      let fullSource: string;
      let shouldPrintResult = false;

      if (isLetDeclaration || isTypeDeclaration) {
        // Add this declaration to our history
        declarations.push(trimmed);
        // Compile with all declarations
        fullSource = declarations.join('\n');
      } else {
        // For expressions, wrap them in a let binding so we can capture the result
        // Include all previous declarations so they're in scope
        const wrappedExpr = `let __repl_result = ${trimmed}`;
        fullSource = [...declarations, wrappedExpr].join('\n');
        shouldPrintResult = true;
      }

      const jsCode = compile(fullSource);

      if (shouldPrintResult) {
        // Execute and capture the result
        const fn = new Function(jsCode + '\nreturn __repl_result;');
        const result = fn();

        // Pretty print the result based on type
        if (typeof result === 'function') {
          console.log('[Function]');
        } else if (typeof result === 'object' && result !== null) {
          // ADT constructors - show the tag and values
          if ('__tag' in result) {
            const values = Object.keys(result)
              .filter(k => k.startsWith('_') && k !== '__tag')
              .map(k => result[k]);
            if (values.length === 0) {
              console.log(result.__tag);
            } else {
              console.log(`${result.__tag}(${values.join(', ')})`);
            }
          } else {
            console.log(result);
          }
        } else {
          console.log(result);
        }
      } else {
        // Just execute declarations
        const fn = new Function(jsCode);
        fn();
      }

    } catch (error) {
      if (error instanceof Error) {
        // Hide the internal __repl_result wrapper from error messages
        const message = error.message.replace(/^In declaration of '__repl_result': /, '');
        console.error(`Error: ${message}`);
      } else {
        console.error(`Error: ${String(error)}`);
      }
    }
  };

  rl.on('line', processLine);

  rl.on('close', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });

  // Show the initial prompt
  rl.prompt();
}
