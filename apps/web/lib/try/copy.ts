import type { Locale } from '@/lib/i18n/config';

export type L = { sv: string; en: string };

export function tr(locale: Locale, l: L): string {
  return locale === 'en' ? l.en : l.sv;
}

export const TRY_COPY = {
  // Hero
  eyebrow: { sv: 'Prova Elevante', en: 'Try Elevante' },
  heroTitle: {
    sv: 'Upplev Elevante',
    en: 'Experience Elevante',
  },
  heroLede: {
    sv: 'Välj en eller flera lektioner och ställ dina egna frågor — Elevante svarar med källa ur lektionen. När du vill kan du sen låta Elevante göra ett prov och rätta det åt dig.',
    en: 'Pick one or more lessons and ask your own questions — Elevante answers with a source from the lesson. When you’re ready, you can let Elevante build a test and grade it for you.',
  },

  // Lektionsväljare (chatt-först)
  scopeLabel: { sv: 'Lektioner', en: 'Lessons' },
  scopeAll: { sv: 'Alla', en: 'All' },
  scopeHint: {
    sv: 'Ämne: Ekologi (Biologi 1). Fråga mot alla, eller välj för att fokusera.',
    en: 'Subject: Ecology (Biology 1). Ask across all, or pick some to focus.',
  },
  backToChat: { sv: '← Tillbaka till chatten', en: '← Back to the chat' },

  // Källspråks-notis (visas bara på EN — chatten svarar på engelska men
  // lektionerna och citaten är svenska).
  swedishNote: {
    sv: '',
    en: 'Lesson recordings are from a Swedish classroom — answers reference the original Swedish transcript.',
  },

  // Steg 2 — ChatStep
  chatTitle: { sv: 'Fråga vad du vill om lektionerna', en: 'Ask anything about the lessons' },
  chatSubtitle: {
    sv: 'Lektionerna är genomgångar från en riktig gymnasieklass. Elevante svarar bara utifrån vad läraren sa — med citat ur lektionen.',
    en: 'The lessons are walkthroughs from a real upper-secondary class. Elevante answers only from what the teacher said — with quotes from the lesson.',
  },
  chatPlaceholder: { sv: 'Ställ en fråga…', en: 'Ask a question…' },
  send: { sv: 'Fråga', en: 'Ask' },
  thinking: { sv: 'Elevante läser lektionen…', en: 'Elevante is reading the lesson…' },
  suggestionsLabel: { sv: 'Eller prova:', en: 'Or try:' },
  sourceLabel: { sv: 'Ur lektionen', en: 'From the lesson' },
  toTest: { sv: 'Testa dig själv', en: 'Test yourself' },
  toTestHint: {
    sv: 'Så funkar det. När du känner dig redo kan du testa dig själv på lektionerna.',
    en: 'That’s how it works. When you feel ready, you can test yourself on the lessons.',
  },
  chatError: {
    sv: 'Kunde inte hämta ett svar just nu. Försök igen om en stund.',
    en: 'Couldn’t fetch an answer right now. Please try again in a moment.',
  },
  rateLimited: {
    sv: 'Du har ställt många frågor på kort tid — testa igen om en stund.',
    en: 'You’ve asked a lot of questions in a short time — try again in a moment.',
  },

  // Steg 3 — TestStep
  testTitle: { sv: 'Dags att testa dig själv', en: 'Time to test yourself' },
  testIntro: {
    sv: 'Elevante skapar ett kort prov från lektionerna du valt. Svara i lugn och ro — sen rättar Elevante och ger dig personlig feedback.',
    en: 'Elevante builds a short test from the lessons you chose. Answer at your own pace — then Elevante grades it and gives you personal feedback.',
  },
  createTest: { sv: 'Skapa prov', en: 'Create test' },
  creatingTest: { sv: 'Skapar prov…', en: 'Building your test…' },
  gradeTest: { sv: 'Rätta mitt prov', en: 'Grade my test' },
  gradingTest: { sv: 'Rättar…', en: 'Grading…' },
  answerPlaceholder: { sv: 'Ditt svar…', en: 'Your answer…' },
  testError: {
    sv: 'Kunde inte skapa provet just nu. Försök igen om en stund.',
    en: 'Couldn’t build the test right now. Please try again in a moment.',
  },
  retry: { sv: 'Försök igen', en: 'Try again' },
  restart: { sv: 'Börja om', en: 'Start over' },

  // Offline-fallback
  offlineNote: {
    sv: 'Demoläge: AI-motorn är inte kopplad här, så svaret är ett förberett exempel.',
    en: 'Demo mode: the AI engine isn’t connected here, so this is a prepared example.',
  },

  // Mjuk avslutning
  outroTitle: { sv: 'Vill du ha det här på din skola?', en: 'Want this at your school?' },
  outroLede: {
    sv: 'Elevante minns varje lektion och hjälper varje elev — på riktigt, i ert sammanhang.',
    en: 'Elevante remembers every lesson and helps every student — for real, in your context.',
  },
  bookDemo: { sv: 'Boka demo', en: 'Book a demo' },
  forSchools: { sv: 'Läs mer för skolor', en: 'Learn more for schools' },
} satisfies Record<string, L>;
