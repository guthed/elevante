// Berget AI-adapter för KB-Whisper transkribering och multilingual embeddings.
//
// API-format är ANTAGET att vara OpenAI-kompatibelt eftersom Berget AI dokumenterar
// `/v1/audio/transcriptions` och `/v1/embeddings`. Verifiera mot deras docs när
// API-key finns och justera nedan vid behov.
//
// Detta är en stub. När BERGET_AI_API_KEY saknas returnerar funktionerna null
// och anroparen faller tillbaka till mockad data.

const BASE_URL = process.env.BERGET_AI_BASE_URL ?? 'https://api.berget.ai/v1';
const API_KEY = process.env.BERGET_AI_API_KEY;
const TRANSCRIBE_MODEL =
  process.env.BERGET_AI_TRANSCRIBE_MODEL ?? 'KBLab/kb-whisper-large';
const EMBED_MODEL =
  process.env.BERGET_AI_EMBED_MODEL ?? 'intfloat/multilingual-e5-large';

export function bergetIsConfigured(): boolean {
  return Boolean(API_KEY);
}

/**
 * Transkribera en audio-fil. Tar audio som Uint8Array eller Blob.
 * Returnerar svensk text utan timestamps (en första iteration).
 */
export async function transcribeAudio(
  audio: Uint8Array | Blob,
  filename: string,
): Promise<string | null> {
  if (!API_KEY) return null;

  const form = new FormData();
  let blob: Blob;
  if (audio instanceof Blob) {
    blob = audio;
  } else {
    // Kopiera in i en garanterat ren ArrayBuffer (TS strict avvisar
    // SharedArrayBuffer-möjligheten i Uint8Array.buffer)
    const copy = new ArrayBuffer(audio.byteLength);
    new Uint8Array(copy).set(audio);
    blob = new Blob([copy]);
  }
  form.append('file', blob, filename);
  form.append('model', TRANSCRIBE_MODEL);
  form.append('language', 'sv');
  form.append('response_format', 'json');

  const res = await fetch(`${BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Berget transcribe failed: ${res.status} ${detail}`);
  }

  const json = (await res.json()) as { text?: string };
  return json.text ?? null;
}

/**
 * Embedda en lista med texter och returnera 1024-dim float-vektorer.
 * Vi använder multilingual-e5-large som default — bra svensk täckning,
 * 1024 dimensioner som matchar vår lesson_chunks.embedding-kolumn.
 */
export async function embedTexts(
  inputs: string[],
): Promise<number[][] | null> {
  if (!API_KEY || inputs.length === 0) return null;

  const res = await fetch(`${BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: inputs,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Berget embed failed: ${res.status} ${detail}`);
  }

  const json = (await res.json()) as {
    data?: { embedding: number[] }[];
  };
  if (!json.data) return null;
  return json.data.map((d) => d.embedding);
}
