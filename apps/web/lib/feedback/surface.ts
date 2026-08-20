import type { Locale } from '@/lib/i18n/config';

/**
 * Var i appen en rapport skickades. Stabila nycklar — de sparas i
 * feedback_reports.surface och får aldrig byta betydelse i efterhand.
 */
export const FEEDBACK_SURFACES = [
  'training_flashcards',
  'training_knowledge_checks',
  'training_picker',
  'chat',
  'library',
  'lesson',
  'exam_prep',
  'class_test',
  'learner_profile',
  'overview',
  'other',
] as const;

export type FeedbackSurface = (typeof FEEDBACK_SURFACES)[number];

/**
 * Namnen MÅSTE stämma exakt med select-alternativen i Notion-databasen
 * 💬 Elevante – Elevfeedback. Notion skapar visserligen ett nytt alternativ
 * om namnet inte finns, vilket är precis problemet: en stavfelsdubblett
 * (t.ex. bindestreck i stället för tankstreck) syns aldrig som ett fel — den
 * dyker bara upp som ännu en färg i vyn. Tankstrecken nedan är U+2013.
 */
const NOTION_SURFACE_LABEL: Record<FeedbackSurface, string> = {
  training_flashcards: 'Plugga – flashcards',
  training_knowledge_checks: 'Plugga – kunskapskoll',
  training_picker: 'Plugga',
  chat: 'Fråga Elevante',
  library: 'Bibliotek',
  lesson: 'Lektion',
  exam_prep: 'Testa dina kunskaper',
  class_test: 'Klassprov',
  learner_profile: 'Din lärprofil',
  overview: 'Översikt',
  other: 'Annat',
};

export function notionSurfaceLabel(surface: FeedbackSurface): string {
  return NOTION_SURFACE_LABEL[surface];
}

/** Kort etikett för eleven — visas i bladet så hen ser vad appen bifogar. */
export function surfaceLabel(surface: FeedbackSurface, locale: Locale): string {
  const en: Record<FeedbackSurface, string> = {
    training_flashcards: 'Practise – flashcards',
    training_knowledge_checks: 'Practise – knowledge check',
    training_picker: 'Practise',
    chat: 'Ask Elevante',
    library: 'Library',
    lesson: 'Lesson',
    exam_prep: 'Test yourself',
    class_test: 'Class test',
    learner_profile: 'Your learner profile',
    overview: 'Overview',
    other: 'Elsewhere in the app',
  };
  return locale === 'en' ? en[surface] : NOTION_SURFACE_LABEL[surface];
}

/**
 * Härleder ytan ur URL:en. Eleven ska aldrig behöva berätta var hen var —
 * det är hela poängen med den här funktionen, och den mest värdefulla delen
 * av en rapport.
 *
 * Matchar på ROLL-segmentet och framåt (`/sv/app/student/ova/...`), så både
 * locale-prefix och roll kan variera utan att mappningen påverkas.
 */
export function deriveSurface(pathname: string): FeedbackSurface {
  const segments = pathname.split('/').filter(Boolean);
  const appIndex = segments.indexOf('app');
  // Utanför /app (eller en oväntad URL-form): vi vet inte var vi är.
  if (appIndex === -1) return 'other';
  const rest = segments.slice(appIndex + 2); // hoppa över "app" och rollen

  if (rest.length === 0) return 'overview';
  const [first, second] = rest;

  switch (first) {
    case 'ova':
      if (second === 'repetera') return 'training_flashcards';
      if (second === 'trana') return 'training_knowledge_checks';
      return 'training_picker';
    case 'chat':
      return 'chat';
    case 'bibliotek':
      return 'library';
    case 'lektioner':
      return 'lesson';
    case 'provplugg':
    case 'prov':
      return 'exam_prep';
    case 'klassprov':
      return 'class_test';
    case 'profil':
      return 'learner_profile';
    default:
      return 'other';
  }
}
