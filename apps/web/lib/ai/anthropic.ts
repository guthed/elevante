import Anthropic from '@anthropic-ai/sdk';
import type { PracticeQuestion, PracticeQuestionType } from '@/lib/supabase/database';

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

function stripFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
}

function textOf(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

const PRACTICE_QUESTION_TYPES: PracticeQuestionType[] = [
  'multiple_choice',
  'short_answer',
  'open',
  'reasoning',
];

export type PracticeLessonInput = {
  id: string;
  title: string | null;
  transcript: string;
};

const TEST_GENERATION_SYSTEM_PROMPT = `Du är en erfaren gymnasielärare i Biologi 1 (Naturvetenskapsprogrammet, årskurs 1). Du skapar ett övningsprov åt en elev inför ett riktigt prov.

Du får transkript från ett antal lektioner. Skapa exakt det antal frågor som efterfrågas, jämnt fördelade över lektionerna och blandat över dessa fyra typer:
- "multiple_choice": flervalsfråga med exakt 4 svarsalternativ, ett rätt. max_points 1.
- "short_answer": kort faktafråga, besvaras med ett ord eller en mening. max_points 1-2.
- "open": öppen fråga ("Förklara...", "Beskriv..."). max_points 2-3.
- "reasoning": resonerande/analytisk fråga ("Resonera kring...", "Jämför..."). max_points 3-4.

REGLER:
- Frågorna får BARA bygga på innehållet i transkripten. Hitta aldrig på fakta.
- Nivån ska matcha Biologi 1 i gymnasiet — inte högskola, inte högstadium.
- Varje fråga måste ha lesson_id satt till id för den lektion den bygger på.
- För multiple_choice: fältet options är en array med 4 strängar, correct_index är 0-3, answer_key är en kort förklaring av varför svaret är rätt.
- För övriga typer: options är null, correct_index är null, answer_key är ett facit / bedömningskriterier som en rättande lärare kan använda.
- Variera frågetyperna — börja gärna lättare och öka svårighetsgraden.

Svara ENDAST med valid JSON, ingen annan text:
{"questions": [{"type": "<typ>", "prompt": "<frågetext>", "lesson_id": "<lekt-id>", "options": ["<a>","<b>","<c>","<d>"] eller null, "correct_index": <0-3> eller null, "answer_key": "<facit>", "max_points": <heltal>}]}`;

/**
 * Genererar ett övningsprov från ett antal lektioners transkript.
 * Returnerar null om Anthropic inte är konfigurerat. Frågorna får id (q1, q2…)
 * satta av anroparen, inte av modellen.
 */
export async function generatePracticeTest(
  lessons: PracticeLessonInput[],
  questionCount: number,
): Promise<Omit<PracticeQuestion, 'id'>[] | null> {
  const client = getClient();
  if (!client || lessons.length === 0) return null;

  const validLessonIds = new Set(lessons.map((l) => l.id));

  const contextBlock = lessons
    .map(
      (l) =>
        `[Lektion — id: ${l.id} — ${l.title ?? 'okänd'}]\n${l.transcript.slice(0, 8000)}`,
    )
    .join('\n\n');

  const userPrompt = `Skapa ett övningsprov med exakt ${questionCount} frågor utifrån dessa lektioner.\n\n${contextBlock}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: TEST_GENERATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  let parsed: { questions?: unknown };
  try {
    parsed = JSON.parse(stripFences(textOf(response)));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed.questions)) return null;

  const questions: Omit<PracticeQuestion, 'id'>[] = [];
  for (const raw of parsed.questions) {
    const q = raw as Record<string, unknown>;
    const type = q.type as PracticeQuestionType;
    if (!PRACTICE_QUESTION_TYPES.includes(type)) continue;
    if (typeof q.prompt !== 'string' || typeof q.answer_key !== 'string') continue;
    const lessonId =
      typeof q.lesson_id === 'string' && validLessonIds.has(q.lesson_id)
        ? q.lesson_id
        : lessons[0]!.id;
    const maxPoints =
      typeof q.max_points === 'number' && q.max_points > 0
        ? Math.round(q.max_points)
        : 1;

    let options: string[] | null = null;
    let correctIndex: number | null = null;
    if (type === 'multiple_choice') {
      if (
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        !q.options.every((o): o is string => typeof o === 'string') ||
        typeof q.correct_index !== 'number' ||
        q.correct_index < 0 ||
        q.correct_index > 3
      ) {
        continue;
      }
      options = q.options;
      correctIndex = q.correct_index;
    }

    questions.push({
      type,
      prompt: q.prompt,
      lesson_id: lessonId,
      options,
      correct_index: correctIndex,
      answer_key: q.answer_key,
      max_points: maxPoints,
    });
  }

  return questions.length > 0 ? questions : null;
}

export type PracticeGradeInput = {
  question_id: string;
  prompt: string;
  answer_key: string;
  max_points: number;
  student_answer: string;
};

export type PracticeGradeResult = {
  grades: { question_id: string; points: number; feedback: string }[];
  overall_feedback: string;
};

const TEST_GRADING_SYSTEM_PROMPT = `Du är en erfaren och rättvis gymnasielärare i Biologi 1. Du rättar en elevs svar på ett övningsprov.

För varje fråga får du frågetexten, ett facit / bedömningskriterier, maxpoäng och elevens svar. Din uppgift:
1. Sätt poäng från 0 till maxpoäng (heltal). Var rättvis — delpoäng för delvis korrekta svar.
2. Skriv en kort feedback (2-4 meningar) som INTE bara säger rätt/fel utan: vad eleven fick rätt, vad som saknades eller var otydligt, och en konkret tips på hur svaret kunde bli bättre. Varm men ärlig ton, tilltala eleven direkt med "du".
3. Om elevens svar är tomt, ge 0 poäng och uppmuntra eleven att försöka nästa gång.

Skriv också en helhetskommentar (overall_feedback, 2-3 meningar): vad eleven verkar behärska och vad som är viktigast att repetera inför det riktiga provet.

Använd svenska. Svara ENDAST med valid JSON, ingen annan text:
{"grades": [{"question_id": "<id>", "points": <heltal>, "feedback": "<feedback>"}], "overall_feedback": "<helhetskommentar>"}`;

/**
 * Rättar de frågor som inte är flerval (flerval rättas deterministiskt i kod).
 * Returnerar null om Anthropic inte är konfigurerat.
 */
export async function gradePracticeTest(
  items: PracticeGradeInput[],
): Promise<PracticeGradeResult | null> {
  const client = getClient();
  if (!client || items.length === 0) return null;

  const block = items
    .map(
      (it) =>
        `Fråga-id: ${it.question_id}\nFråga: ${it.prompt}\nMaxpoäng: ${it.max_points}\nFacit: ${it.answer_key}\nElevens svar: ${it.student_answer.trim() || '(tomt)'}`,
    )
    .join('\n\n---\n\n');

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3072,
    system: TEST_GRADING_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: block }],
  });

  let parsed: { grades?: unknown; overall_feedback?: unknown };
  try {
    parsed = JSON.parse(stripFences(textOf(response)));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed.grades)) return null;

  const grades: PracticeGradeResult['grades'] = [];
  for (const raw of parsed.grades) {
    const g = raw as Record<string, unknown>;
    if (typeof g.question_id !== 'string') continue;
    grades.push({
      question_id: g.question_id,
      points: typeof g.points === 'number' ? Math.max(0, Math.round(g.points)) : 0,
      feedback: typeof g.feedback === 'string' ? g.feedback : '',
    });
  }

  return {
    grades,
    overall_feedback:
      typeof parsed.overall_feedback === 'string' ? parsed.overall_feedback : '',
  };
}
