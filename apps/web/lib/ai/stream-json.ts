/**
 * Extraherar det avkodade värdet av "answer"-fältet ur en (möjligen ofullständig)
 * JSON-sträng som strömmas in. Hanterar JSON-escapes; en escape som kapats mitt i
 * (t.ex. halv `\u`) läks av nästa chunk eftersom hela råtexten avkodas om varje gång.
 *
 * Delas av /api/try/chat och /api/chat/stream — båda strömmar samma
 * `{"answer": "...", "concepts": [...]}`-format från streamRagRaw.
 */
export function decodeAnswerSoFar(raw: string): string {
  const key = raw.indexOf('"answer"');
  if (key === -1) return '';
  let i = key + '"answer"'.length;
  while (i < raw.length && raw[i] !== ':') i++;
  i++; // förbi kolon
  while (i < raw.length && raw[i] !== '"') i++;
  if (i >= raw.length) return '';
  i++; // förbi inledande citattecken
  let out = '';
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '\\') {
      const next = raw[i + 1];
      if (next === undefined) break; // ofullständig escape i slutet — vänta på mer
      if (next === 'u') {
        const hex = raw.slice(i + 2, i + 6);
        if (hex.length < 4) break; // ofullständig \u — vänta på mer
        out += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      const map: Record<string, string> = {
        n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/',
      };
      out += map[next] ?? next;
      i += 2;
      continue;
    }
    if (ch === '"') break; // avslutande citattecken — answer klar
    out += ch;
    i++;
  }
  return out;
}

/** Parsar hela (färdiga) JSON-svaret till answer + concepts. */
export function parseRagJson(raw: string): { answer: string | null; concepts: string[] } {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  try {
    const p = JSON.parse(cleaned) as { answer?: string; concepts?: unknown };
    return {
      answer: typeof p.answer === 'string' ? p.answer : null,
      concepts: Array.isArray(p.concepts)
        ? p.concepts.filter((c): c is string => typeof c === 'string').slice(0, 3)
        : [],
    };
  } catch {
    return { answer: null, concepts: [] };
  }
}
