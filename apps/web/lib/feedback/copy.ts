import type { Locale } from '@/lib/i18n/config';
import type { FeedbackCategory } from '@/lib/supabase/database';

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  'not_working',
  'confused',
  'looks_wrong',
];

/**
 * Namnen MÅSTE stämma exakt med select-alternativen "Eleven valde" i
 * Notion-databasen — se kommentaren i surface.ts om varför en avvikelse
 * aldrig syns som ett fel.
 */
const NOTION_CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  not_working: 'Något fungerar inte',
  confused: 'Jag förstår inte hur jag gör',
  looks_wrong: 'Något ser konstigt ut',
};

export function notionCategoryLabel(category: FeedbackCategory): string {
  return NOTION_CATEGORY_LABEL[category];
}

type Localized = { sv: string; en: string };

/**
 * Elevens tre val — i elevspråk, inte vår triagevokabulär. Hjälptexten under
 * varje val är det som håller isär dem; utan den hamnar allt i "Något
 * fungerar inte".
 */
export const CATEGORY_COPY: Record<
  FeedbackCategory,
  { label: Localized; hint: Localized }
> = {
  not_working: {
    label: { sv: 'Något fungerar inte', en: "Something isn't working" },
    hint: {
      sv: 'Knappen gör inget, sidan laddar för evigt, något kraschar.',
      en: 'A button does nothing, the page loads forever, something crashes.',
    },
  },
  confused: {
    label: { sv: 'Jag förstår inte hur jag gör', en: "I don't understand how to do this" },
    hint: {
      sv: 'Du hittar inte, eller vet inte vad som förväntas av dig här.',
      en: "You can't find your way, or don't know what's expected of you here.",
    },
  },
  looks_wrong: {
    label: { sv: 'Något ser konstigt ut', en: 'Something looks wrong' },
    hint: {
      sv: 'Texten ser trasig ut, eller så står det något som inte stämmer.',
      en: 'The layout looks broken, or something here states something untrue.',
    },
  },
};

export const FEEDBACK_COPY = {
  trigger: { sv: 'Rapportera', en: 'Report' },
  triggerAria: {
    sv: 'Rapportera något som inte fungerar',
    en: 'Report something that is not working',
  },
  title: { sv: 'Vad strular?', en: "What's not working?" },
  // Ramen som håller databasen ren. Utan den blir kanalen läxhjälp, och du
  // läser 90 elevers biologifrågor i stället för produktfeedback. Meningen
  // avvisar inte — den pekar vidare till chatten.
  scopeNote: {
    sv: 'Det här handlar om appen — inte om ämnet. Undrar du något om lektionen, fråga Elevante i stället.',
    en: 'This is about the app — not the subject. If you are wondering about the lesson itself, ask Elevante instead.',
  },
  scopeLinkLabel: { sv: 'Fråga Elevante', en: 'Ask Elevante' },
  messageLabel: { sv: 'Vill du berätta mer? (frivilligt)', en: 'Want to say more? (optional)' },
  messagePlaceholder: {
    sv: 'Skriv med egna ord vad som hände.',
    en: 'Describe what happened in your own words.',
  },
  // Eleven ska veta exakt vad som skickas med — inget smyginsamlande.
  contextHeading: { sv: 'Det här skickas med automatiskt', en: 'This is attached automatically' },
  submit: { sv: 'Skicka', en: 'Send' },
  submitting: { sv: 'Skickar…', en: 'Sending…' },
  cancel: { sv: 'Avbryt', en: 'Cancel' },
  close: { sv: 'Stäng', en: 'Close' },
  successTitle: { sv: 'Tack — det här hjälper.', en: 'Thanks — this helps.' },
  successBody: {
    sv: 'Rapporten är skickad. Du behöver inte göra något mer.',
    en: 'Your report is on its way. Nothing more for you to do.',
  },
  errorMissing: { sv: 'Välj ett av alternativen först.', en: 'Pick one of the options first.' },
  errorGeneric: {
    sv: 'Kunde inte skicka just nu. Försök igen om en stund.',
    en: 'Could not send right now. Try again in a moment.',
  },
  errorRateLimit: {
    sv: 'Du har skickat många rapporter nyss. Vänta en stund innan nästa.',
    en: 'You have sent a lot of reports just now. Give it a moment before the next one.',
  },
} satisfies Record<string, Localized>;

export function t(locale: Locale, l: Localized): string {
  return locale === 'en' ? l.en : l.sv;
}
