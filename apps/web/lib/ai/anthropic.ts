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

function buildSystemPrompt(lessonConcepts: string[]): string {
  const conceptsBlock =
    lessonConcepts.length > 0
      ? `\n\nHär är listan över koncept som behandlas i lektionen:\n${lessonConcepts.map((c) => `- ${c}`).join('\n')}\n\nFörutom att svara på frågan, identifiera vilka 1-3 av dessa koncept som frågan tangerar mest. Om frågan inte passar något koncept, returnera en tom array.`
      : '';

  return `Du är Elevante, en AI-assistent som hjälper gymnasieelever att förstå sina lektioner.

REGLER (måste följas exakt):
1. Du svarar BARA med information som finns i de lektionsutdrag som ges nedan.
2. Om svaret inte finns i utdragen — säg det rakt på sak: "Det togs inte upp på den här lektionen."
3. Hitta aldrig på fakta. Gissa aldrig. Citera aldrig läroböcker eller externa källor.
4. Skriv på samma språk som frågan (svenska eller engelska).
5. Var rak och klar — undvik fyllmedel som "Bra fråga!" eller "Som sagt".
6. När du citerar ett utdrag, hänvisa till det med lektionens titel.

Du är ingen privat lärare i största allmänhet — du är specifikt en kompis till lektionen.${conceptsBlock}

Svara ENDAST med valid JSON i detta format, ingen annan text:
{"answer": "<ditt svar på elevens fråga>", "concepts": ["<koncept 1>", "<koncept 2>"]}`;
}

export type RagChunk = {
  lessonId: string;
  lessonTitle: string | null;
  content: string;
};

export type RagAnswer = {
  content: string;
  sources: { lesson_id: string; lesson_title: string | null; excerpt: string }[];
  concepts: string[];
};

/**
 * Besvara en elevfråga med strikt RAG mot tillhandahållna lektionschunks.
 * Returnerar null om Anthropic inte är konfigurerat — anroparen faller då
 * tillbaka till mockedAnswer. lessonConcepts används för att tagga frågan
 * med 1-3 av lektionens koncept.
 */
export async function answerWithRag(
  question: string,
  chunks: RagChunk[],
  lessonConcepts: string[] = [],
): Promise<RagAnswer | null> {
  const client = getClient();
  if (!client) return null;

  if (chunks.length === 0) {
    return {
      content: 'Det togs inte upp på den här lektionen.',
      sources: [],
      concepts: [],
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
    system: buildSystemPrompt(lessonConcepts),
    messages: [{ role: 'user', content: userPrompt }],
  });

  const rawText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  // Claude wrappar ibland JSON i ```json ... ``` trots instruktion — strippa fences
  const cleaned = rawText.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');

  let answerText = rawText;
  let concepts: string[] = [];
  try {
    const parsed = JSON.parse(cleaned) as { answer?: string; concepts?: unknown };
    if (typeof parsed.answer === 'string') answerText = parsed.answer;
    if (Array.isArray(parsed.concepts)) {
      concepts = parsed.concepts.filter((c): c is string => typeof c === 'string').slice(0, 3);
    }
  } catch {
    // Om JSON-parsing misslyckas, använd raw text som svar utan koncept
  }

  return {
    content: answerText,
    sources: chunks.map((chunk) => ({
      lesson_id: chunk.lessonId,
      lesson_title: chunk.lessonTitle,
      excerpt: chunk.content.slice(0, 240),
    })),
    concepts,
  };
}

type ClassEngagement = {
  concept: string;
  totalQuestions: number;
  studentsAsking: number;
};

/**
 * Genererar en handlingsbar mening till läraren baserat på klassens engagemang.
 * Returnerar tom sträng om Anthropic inte är konfigurerat.
 */
export async function generateLessonInsight(
  lessonTitle: string,
  engagement: ClassEngagement[],
  studentsNotViewed: string[],
  totalStudents: number,
): Promise<string> {
  const client = getClient();
  if (!client) return '';

  const top3 = [...engagement]
    .sort((a, b) => b.totalQuestions - a.totalQuestions)
    .slice(0, 3)
    .map((e) => `${e.concept} (${e.totalQuestions} frågor, ${e.studentsAsking} elever)`);

  const prompt = `Du är en pedagogisk assistent. En lärare ser en översikt över sin klass förståelse av lektionen "${lessonTitle}".

Data:
- Totalt elever: ${totalStudents}
- Elever som inte öppnat lektionen: ${studentsNotViewed.length === 0 ? '(alla har öppnat)' : studentsNotViewed.join(', ')}
- Topp koncept-frågor: ${top3.join('; ')}

Skriv EN mening (max 30 ord) som ger läraren en handlingsbar insikt. Format: "Klassen är osäker på X. [Y och Z] har inte öppnat lektionen — överväg att kolla med dem." Variera om datan kräver annan struktur. Använd svenska.

Svara endast med insikt-meningen, ingen annan text.`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
  } catch {
    return '';
  }
}

/**
 * Genererar en kort insikt om en enskild elev. Statisk fallback om eleven
 * inte öppnat eller inte frågat.
 */
export async function generateStudentInsight(
  studentName: string,
  conceptCounts: Record<string, number>,
  totalQuestions: number,
  hasViewed: boolean,
): Promise<string> {
  if (!hasViewed) return `${studentName} har inte öppnat lektionen ännu.`;
  if (totalQuestions === 0) return `${studentName} har öppnat lektionen men ställt inga frågor.`;

  const client = getClient();
  if (!client) return '';

  const conceptSummary = Object.entries(conceptCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([c, n]) => `${c} (${n})`)
    .join(', ');

  const prompt = `En lärare tittar på en elev (${studentName}) i sin klass. Eleven har ställt ${totalQuestions} frågor om en lektion, fördelade på koncept: ${conceptSummary}.

Skriv EN mening (max 25 ord) som beskriver elevens läge. Format: "${studentName} är engagerad men osäker på X." eller "${studentName} har frågat mest om X." Använd svenska.

Svara endast med insikt-meningen, ingen annan text.`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
  } catch {
    return '';
  }
}
