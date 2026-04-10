import type { Locale } from './config';
import type { Dictionary } from './types';

const dictionaries = {
  sv: () => import('./locales/sv').then((m) => m.default),
  en: () => import('./locales/en').then((m) => m.default),
} satisfies Record<Locale, () => Promise<Dictionary>>;

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}

export type { Dictionary };
