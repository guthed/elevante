// Engångsscript för att generera summary + questions för en redan
// transkriberad lektion. Använd: node scripts/backfill-lesson-content.mjs <lesson_id>

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), 'apps/web/.env.local');
const envContent = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx), l.slice(idx + 1).replace(/^"|"$/g, '')];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929';
const EMAIL = 'john@guthed.se';
const PASSWORD = 'ElevanteDemo2026!';

const lessonId = process.argv[2];
if (!lessonId) {
  console.error('Usage: node scripts/backfill-lesson-content.mjs <lesson_id>');
  process.exit(1);
}

const SYSTEM_PROMPT = `Du är Elevante — en varm mentor som var med på lektionen och hjälper elever förstå vad som hände.

Du får ett transkript från en lektion. Ditt jobb är att:
1. Skriva en varm, kort sammanfattning (3-5 meningar) som om du pratar med eleven
2. Föreslå exakt två startfrågor som hjälper eleven börja utforska innehållet
3. Extrahera ett kort ämne (max 6 ord) som kan användas i lektionens titel
4. Lista 5-8 nyckelkoncept som behandlas i lektionen — de begrepp eleverna ska kunna efter lektionen

REGLER:
- Sammanfattningen är 3-5 meningar, max cirka 400 tecken
- Använd warm mentor-ton: "Idag handlade lektionen om...", "Anna gick igenom..."
- Hänvisa till läraren med förnamn när det framgår av transkriptet
- Citera lärarens egna konkreta exempel där möjligt
- Hitta ALDRIG på fakta som inte finns i transkriptet
- Frågor är pedagogiska ("Förklara skillnaden mellan...", "Beskriv hur...")
- Frågorna måste vara besvarbara enbart från transkriptet
- Ämnet är kort och deskriptivt (t.ex. "Ekosystem och näringsvävar")
- Koncepten är 1-4 ord vardera (t.ex. "Näringspyramid", "Biotiska faktorer", "Energiflöde")
- Koncept är nominalfraser eller substantiv, inte hela meningar

Svara ENDAST med valid JSON i detta format, ingen annan text:
{"topic": "<kort ämne>", "summary": "<3-5 meningar>", "questions": ["<fråga 1>", "<fråga 2>"], "concepts": ["<koncept 1>", "<koncept 2>", "<koncept 3>", "<koncept 4>", "<koncept 5>"]}`;

// Logga in för att få JWT med rätt RLS-kontext
const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const auth = await authRes.json();
const token = auth.access_token;

// Hämta lesson + teacher
const lessonRes = await fetch(
  `${SUPABASE_URL}/rest/v1/lessons?id=eq.${lessonId}&select=transcript_text,teacher_id,recorded_at,course_id`,
  { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } },
);
const [lesson] = await lessonRes.json();
if (!lesson?.transcript_text) {
  console.error('Lektion saknar transcript_text');
  process.exit(1);
}

let teacherName = null;
if (lesson.teacher_id) {
  const tRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${lesson.teacher_id}&select=full_name`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } },
  );
  const [teacher] = await tRes.json();
  teacherName = teacher?.full_name ?? null;
}

console.log(`Genererar innehåll för lektion ${lessonId}, lärare: ${teacherName}...`);

// Anthropic
const userMsg = teacherName
  ? `Lärare: ${teacherName}\n\nTranskript:\n${lesson.transcript_text}`
  : `Transkript:\n${lesson.transcript_text}`;

const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': ANTHROPIC_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  }),
});
const anthropic = await anthropicRes.json();
const raw = anthropic.content?.[0]?.text ?? '';
// Claude wrappar ibland JSON i ```json ... ``` trots instruktion — strippa fences
const cleaned = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
const parsed = JSON.parse(cleaned);

console.log('Genererat innehåll:');
console.log(JSON.stringify(parsed, null, 2));

// Bygg datum-baserad titel
const dateLabel = new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric',
  month: 'long',
}).format(new Date(lesson.recorded_at));
const newTitle = `${dateLabel} — ${parsed.topic}`;

// Uppdatera lektionen
const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/lessons?id=eq.${lessonId}`, {
  method: 'PATCH',
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({
    summary: parsed.summary,
    suggested_questions: parsed.questions,
    ai_generated_topic: parsed.topic,
    title: newTitle,
    concepts: parsed.concepts,
  }),
});

if (!updateRes.ok) {
  console.error('Update failed:', updateRes.status, await updateRes.text());
  process.exit(1);
}

console.log(`✅ Klar. Titel: ${newTitle}`);
