export const PRICE_PER_STUDENT_SEK = 500;

// Inget rabattpåslag — alltid fullt pris (beslut i specen).
export function estimateAnnualPrice(students: number): number {
  return Math.max(0, Math.round(students)) * PRICE_PER_STUDENT_SEK;
}

export function formatSEK(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'sv' ? 'sv-SE' : 'en-GB', {
    style: 'currency', currency: 'SEK', maximumFractionDigits: 0,
  }).format(amount);
}
