import type { Locale } from '@/lib/i18n/config';

export type L = { sv: string; en: string };

export function tr(locale: Locale, l: L): string {
  return locale === 'en' ? l.en : l.sv;
}

export const TRY_COPY = {
  // Hero
  eyebrow: { sv: 'Prova Elevante', en: 'Try Elevante' },
  // Rubriken delas så nyckelfrasen kan accentfärgas (sage-deep — grönt som
  // håller kontrast på ivory; coral funkar bara som fyllning, inte som text).
  heroTitle: {
    sv: 'Fråga vad du vill om en',
    en: 'Ask anything about a',
  },
  heroTitleAccent: {
    sv: 'riktig lektion',
    en: 'real lesson',
  },
  heroLede: {
    sv: 'Sex inspelade lektioner ur en gymnasiekurs i Ekologi (Biologi 1). Ställ dina egna frågor — Elevante svarar med citat ur lektionen, och kan sen göra ett prov och rätta det åt dig.',
    en: 'Six recorded lessons from an upper-secondary Ecology course (Biology 1). Ask your own questions — Elevante answers with quotes from the lesson, then can build a test and grade it for you.',
  },
  // Mjuk trust-strip under hjälte-ingressen (sanna, lugnande signaler).
  trust1: { sv: 'GDPR-säkert', en: 'GDPR-secure' },
  trust2: { sv: 'All data i Sverige', en: 'All data in Sweden' },
  trust3: { sv: 'Svar bara ur lektionen', en: 'Answers only from the lesson' },

  // Lektionsväljare (chatt-först)
  scopeLabel: { sv: 'Lektioner', en: 'Lessons' },
  scopeAll: { sv: 'Alla lektioner', en: 'All lessons' },
  scopeSelected: { sv: '{n} lektioner valda', en: '{n} lessons selected' },
  lessonWord: { sv: 'Lektion', en: 'Lesson' },
  scopeHint: {
    sv: 'Fråga mot alla, eller välj en lektion att fokusera på.',
    en: 'Ask across all, or pick a lesson to focus on.',
  },
  backToChat: { sv: '← Tillbaka till chatten', en: '← Back to the chat' },

  // Källspråks-notis (visas bara på EN — chatten svarar på engelska men
  // lektionerna och citaten är svenska).
  swedishNote: {
    sv: '',
    en: 'Lesson recordings are from a Swedish classroom — answers reference the original Swedish transcript.',
  },

  // Steg 2 — ChatStep
  chatPlaceholder: { sv: 'Ställ en fråga…', en: 'Ask a question…' },
  send: { sv: 'Fråga', en: 'Ask' },
  thinking: { sv: 'Elevante läser lektionen…', en: 'Elevante is reading the lesson…' },
  suggestionsLabel: { sv: 'Eller prova:', en: 'Or try:' },
  sourceLabel: { sv: 'Ur lektionen', en: 'From the lesson' },
  citationGrounding: {
    sv: 'Svaret bygger på det här — ur lektionen, inte från nätet.',
    en: 'The answer is grounded in this — from the lesson, not the web.',
  },
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

  // Säljande avslutning (efter att besökaren testat demon)
  outroTitle: {
    sv: 'Du testade precis framtidens klassrum. Varför inte ge någon annan chansen?',
    en: 'You just tried the classroom of the future. Why not give someone else the chance?',
  },
  outroLede: {
    sv: 'Samma upplevelse, fast på era riktiga lektioner — varje genomgång inspelad, sökbar och redo att plugga på. Vi visar hur på 30 minuter.',
    en: 'The same experience, but on your own lessons — every class recorded, searchable, and ready to study. We’ll show you how in 30 minutes.',
  },
  bookDemo: { sv: 'Boka demo', en: 'Book a demo' },
  forSchools: { sv: 'Läs mer för skolor', en: 'Learn more for schools' },

  // Peak-delight-CTA direkt efter provresultatet (starkaste wow-stunden)
  resultCtaTitle: {
    sv: 'Elevante gjorde och rättade provet åt dig.',
    en: 'Elevante built and graded that test for you.',
  },
  resultCtaLede: {
    sv: 'Tänk att era elever fick samma sak på varje genomgång — inspelat, sökbart, med prov och feedback på köpet.',
    en: 'Now imagine your students getting this on every lesson — recorded, searchable, with tests and feedback built in.',
  },
  resultShareLink: { sv: 'Eller tipsa en kollega', en: 'Or tip a colleague' },

  // Delning (tipsa en kollega)
  shareTitle: { sv: 'Känner du någon som borde se det här?', en: 'Know someone who should see this?' },
  shareHint: {
    sv: 'Tipsa en kollega — vi skickar dem en länk att prova själva.',
    en: 'Tip a colleague — we’ll send them a link to try it themselves.',
  },
  shareName: { sv: 'Ditt namn', en: 'Your name' },
  shareYourEmail: { sv: 'Din mejl', en: 'Your email' },
  shareColleagueEmail: { sv: 'Kollegans mejl', en: 'Colleague’s email' },
  shareMessage: { sv: 'Hälsning (valfritt)', en: 'Message (optional)' },
  shareSend: { sv: 'Skicka tipset', en: 'Send the tip' },
  shareSending: { sv: 'Skickar…', en: 'Sending…' },
  shareThanks: {
    sv: 'Tack — vi har skickat tipset till {recipient}.',
    en: 'Thanks — we’ve sent the tip to {recipient}.',
  },
  shareErrorMissing: {
    sv: 'Fyll i ditt namn och två giltiga mejladresser.',
    en: 'Enter your name and two valid email addresses.',
  },
  shareErrorRate: {
    sv: 'Du har delat många gånger nyss — försök igen om en stund.',
    en: 'You’ve shared a lot recently — try again in a bit.',
  },
  shareErrorGeneric: {
    sv: 'Kunde inte skicka just nu. Försök igen om en stund.',
    en: 'Couldn’t send right now. Please try again in a moment.',
  },
} satisfies Record<string, L>;
