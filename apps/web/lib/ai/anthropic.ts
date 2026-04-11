import Anthropic from '@anthropic-ai/sdk';

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929';

let cachedClient: Anthropic | null = null;

export function anthropicIsConfigured(): boolean {
  return Boolean(API_KEY);
}

function getClient(): Anthropic | null {
  if (!API_KEY) return null;
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: API_KEY });
  }
  return cachedClient;
}

const SYSTEM_PROMPT = `Du är Elevante, en AI-assistent som hjälper gymnasieelever att förstå sina lektioner.

REGLER (måste följas exakt):
1. Du svarar BARA med information som finns i de lektionsutdrag som ges nedan.
2. Om svaret inte finns i utdragen — säg det rakt på sak: "Det togs inte upp på den här lektionen."
3. Hitta aldrig på fakta. Gissa aldrig. Citera aldrig läroböcker eller externa källor.
4. Skriv på samma språk som frågan (svenska eller engelska).
5. Var rak och klar — undvik fyllmedel som "Bra fråga!" eller "Som sagt".
6. När du citerar ett utdrag, hänvisa till det med lektionens titel.

Du är ingen privat lärare i största allmänhet — du är specifikt en kompis till lektionen.`;

export type RagChunk = {
  lessonId: string;
  lessonTitle: string | null;
  content: string;
};

export type RagAnswer = {
  content: string;
  sources: { lesson_id: string; lesson_title: string | null; excerpt: string }[];
};

/**
 * Besvara en elevfråga med strikt RAG mot tillhandahållna lektionschunks.
 * Returnerar null om Anthropic inte är konfigurerat — anroparen faller då
 * tillbaka till mockedAnswer.
 */
export async function answerWithRag(
  question: string,
  chunks: RagChunk[],
): Promise<RagAnswer | null> {
  const client = getClient();
  if (!client) return null;

  if (chunks.length === 0) {
    return {
      content: 'Det togs inte upp på den här lektionen.',
      sources: [],
    };
  }

  const contextBlock = chunks
    .map(
      (chunk, idx) =>
        `[Utdrag ${idx + 1} — ${chunk.lessonTitle ?? 'okänd lektion'}]\n${chunk.content}`,
    )
    .join('\n\n');

  const userPrompt = `Lektionsutdrag:\n\n${contextBlock}\n\nFråga: ${question}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  return {
    content: text,
    sources: chunks.map((chunk) => ({
      lesson_id: chunk.lessonId,
      lesson_title: chunk.lessonTitle,
      excerpt: chunk.content.slice(0, 240),
    })),
  };
}
