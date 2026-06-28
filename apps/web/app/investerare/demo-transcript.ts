// Syntetisk Ekologi-lektion för den live elev-chatten i investerardecket.
// Ingen riktig lektion — lärarens "egna ord" är påhittade men pedagogiskt korrekta,
// så den riktiga strikt-RAG-motorn (answerWithRag) kan svara grundat i texten.
// Samma ämne som lärarvyns förståelsekarta (Ekologi) → konsekvent demo.

import type { L } from './content';

export const DEMO_SUBJECT: L = { sv: 'Ekologi', en: 'Ecology' };
export const DEMO_LESSON_TITLE = 'Ekologi — energiflöden och kretslopp';
export const DEMO_CONCEPTS = ['Fotosyntes', 'Cellandning', 'Näringskedjor', 'Kolets kretslopp', 'Ekosystem'];

// Transkriptet i tidsstämplade segment — används både som RAG-kontext och som
// källcitat ("citat ur lektionen") i chatten.
export type TranscriptSegment = { ts: string; text: string };
export const DEMO_SEGMENTS: TranscriptSegment[] = [
  { ts: '04:30', text: 'Fotosyntesen är när växten fångar in solljus och gör om koldioxid och vatten till druvsocker, alltså glukos, och släpper ut syre på köpet. Det är så växten lagrar solens energi i kemisk form.' },
  { ts: '09:10', text: 'Cellandningen är nästan tvärtom mot fotosyntesen. Cellen bryter ner glukosen med hjälp av syre och frigör energin som cellen behöver för att leva. Det som blir kvar är koldioxid och vatten.' },
  { ts: '15:40', text: 'I en näringskedja förs energin vidare led för led — från växten till växtätaren till rovdjuret. Men i varje steg försvinner ungefär nio tiondelar som värme, så bara en liten del av energin når ända upp till toppen.' },
  { ts: '22:05', text: 'Kolet rör sig i ett kretslopp. Växterna binder kol när de fotosyntetiserar, djur och nedbrytare andas tillbaka det som koldioxid, och när vi förbränner något händer samma sak. Kolet försvinner aldrig, det byter bara form.' },
  { ts: '27:50', text: 'Ett ekosystem är alla organismer på en plats tillsammans med miljön de lever i. Det är i balans när flödena av energi och näring fungerar — rubbar man en del påverkas allt det andra.' },
];

export const DEMO_TRANSCRIPT = DEMO_SEGMENTS.map((s) => `[${s.ts}] ${s.text}`).join('\n\n');

// Förseedad, pågående konversation grundad i transkriptet ovan.
export type DemoMessage = {
  role: 'user' | 'assistant';
  content: string;
  citation?: { ts: string; quote: string };
};
export const DEMO_SEED: DemoMessage[] = [
  { role: 'user', content: 'Vad är skillnaden mellan fotosyntes och cellandning?' },
  {
    role: 'assistant',
    content:
      'Fotosyntesen lagrar energi: växten gör om koldioxid och vatten till glukos och släpper ut syre. Cellandningen gör nästan tvärtom — cellen bryter ner glukosen med syre och frigör energin den behöver, och bildar koldioxid och vatten. Det ena lagrar solens energi, det andra frigör den.',
    citation: { ts: '09:10', quote: 'Cellandningen är nästan tvärtom mot fotosyntesen. Cellen bryter ner glukosen med hjälp av syre och frigör energin…' },
  },
];

// Förslag att klicka på (hjälper användaren att testa snabbt).
export const DEMO_SUGGESTIONS: string[] = [
  'Varför försvinner energi i näringskedjan?',
  'Vad händer med kolet när en växt dör?',
  'Vad menas med att ett ekosystem är i balans?',
];

// ── UI-strängar (bilingualt) ──────────────────────────────────────
export const CHAT_UI: Record<string, L> = {
  chrome: { sv: 'Elevante · Elevvy', en: 'Elevante · Student view' },
  badge: { sv: 'Live-demo', en: 'Live demo' },
  subjectLabel: { sv: 'Ämne', en: 'Subject' },
  lede: {
    sv: 'En pågående chatt om dagens Ekologi-lektion. Testa själv — ställ en egen fråga om ekologin nedan.',
    en: 'An ongoing chat about today’s Ecology lesson. Try it yourself — ask your own question about ecology below.',
  },
  placeholder: { sv: 'Ställ en fråga om ekologin…', en: 'Ask a question about ecology…' },
  send: { sv: 'Fråga', en: 'Ask' },
  thinking: { sv: 'Elevante läser lektionen…', en: 'Elevante is reading the lesson…' },
  sourceLabel: { sv: 'Ur lektionen', en: 'From the lesson' },
  suggestionsLabel: { sv: 'Eller prova:', en: 'Or try:' },
  error: {
    sv: 'Kunde inte hämta ett svar just nu. Försök igen om en stund.',
    en: 'Couldn’t fetch an answer right now. Please try again in a moment.',
  },
  note: {
    sv: 'Riktiga produktmotorn (strikt RAG, Claude) svarar grundat i en syntetisk demolektion — aldrig påhittat.',
    en: 'The real product engine (strict RAG, Claude) answers grounded in a synthetic demo lesson — never made up.',
  },
};
