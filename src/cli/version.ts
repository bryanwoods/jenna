import * as fs from 'fs';

/**
 * The compiler version, read from package.json so it has one source of truth
 */
export function jennaVersion(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf-8')
    );
    return pkg.version;
  } catch {
    return 'unknown';
  }
}
