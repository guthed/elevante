export const PRICE_PER_STUDENT_SEK = 500;
export const PRICE_PER_STUDENT_MONTH_SEK = Math.round(PRICE_PER_STUDENT_SEK / 12);

// Inget rabattpåslag — alltid fullt pris (beslut i specen).
export function estimateAnnualPrice(students: number): number {
  return Math.max(0, Math.round(students)) * PRICE_PER_STUDENT_SEK;
}

export function formatSEK(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'sv' ? 'sv-SE' : 'en-GB', {
    style: 'currency', currency: 'SEK', maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Moms: kommunal vs fristående huvudman ──────────────────────────────
//
// FÖRBEREDD MEN INTE AKTIVERAD. Satserna nedan är ännu inte verifierade av
// revisor/Skatteverket — se Notion-uppgiften "Verifiera moms-hanteringen
// (kommunal vs fristående huvudman)". Sätt VAT_BREAKDOWN_ENABLED till true
// först när dessa tre är bekräftade:
//   1. att Elevantes tjänst faktiskt är 25 % moms,
//   2. att kommunkontosystemet ger full neutralitet här,
//   3. att schablonen är 6 % och presenteras ärligt.
// Så länge flaggan är false visas ingenting av detta publikt.
export const VAT_BREAKDOWN_ENABLED: boolean = false;

export const VAT_RATE = 0.25;
export const INDEPENDENT_VAT_SCHABLON_RATE = 0.06;

export type HuvudmanType = 'kommunal' | 'fristaende';

export type VatBreakdown = {
  /** Listpriset — det vi fakturerar, exkl. moms. */
  net: number;
  /** Momsbeloppet ovanpå listpriset. */
  vat: number;
  /** Att betala på fakturan, inkl. moms. */
  gross: number;
  /** Reell kostnad efter den kompensation huvudmannen har rätt till. */
  effectiveCost: number;
  compensation: 'kommunkonto' | 'schablon';
};

export function vatBreakdown(netAmount: number, type: HuvudmanType): VatBreakdown {
  const net = Math.max(0, Math.round(netAmount));
  const vat = Math.round(net * VAT_RATE);
  const gross = net + vat;

  // Kommunal huvudman: utbildning är momsbefriad och ger ingen avdragsrätt,
  // men kommunen får ingående moms ersatt via kommunkontosystemet
  // (lag 2005:807). Momsen blir därmed kostnadsneutral.
  //
  // Fristående huvudman: samma momsbefrielse, ingen avdragsrätt — och
  // omfattas INTE av kommunkontosystemet. Kompensationen ges i stället som
  // en schablon på det TOTALA bidragsbeloppet, inte som avdrag på det
  // enskilda inköpet. Därför subtraherar vi den medvetet inte här: det
  // skulle ge falsk precision. Den faktiska utgiften för just det här köpet
  // är bruttobeloppet, och schablonen nämns separat i copyn.
  return type === 'kommunal'
    ? { net, vat, gross, effectiveCost: net, compensation: 'kommunkonto' }
    : { net, vat, gross, effectiveCost: gross, compensation: 'schablon' };
}
