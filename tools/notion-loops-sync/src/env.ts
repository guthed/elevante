import { readFileSync, existsSync } from 'node:fs';

/**
 * Minimal .env-läsare. Undviker ett beroende till dotenv för ett verktyg som
 * annars är helt dependency-fritt. Redan satta miljövariabler vinner alltid —
 * så `LOOPS_API_KEY=... npm run sync` överskuggar filen.
 */
export function loadEnvFiles(paths: string[]): string[] {
  const loaded: string[] = [];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    for (const [key, value] of Object.entries(parseEnv(readFileSync(path, 'utf8')))) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
    loaded.push(path);
  }
  return loaded;
}

export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const withoutExport = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eq = withoutExport.indexOf('=');
    if (eq <= 0) continue;
    const key = withoutExport.slice(0, eq).trim();
    let value = withoutExport.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    } else {
      // Avslutande kommentar på oquotad rad: FOO=bar # kommentar
      const hash = value.indexOf(' #');
      if (hash >= 0) value = value.slice(0, hash).trim();
    }
    out[key] = value;
  }
  return out;
}
