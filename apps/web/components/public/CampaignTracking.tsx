import { AlbacrossSiteId } from './Analytics';
import { CookieConsent } from './CookieConsent';
import VisitTracker from '@/components/showcase/VisitTracker';

/**
 * Spårning för säljsidorna (/rektor, /larare). De ligger utanför [locale] och
 * ärver därför inte den publika layoutens wiring — den här komponenten är
 * motsvarigheten, i ett stycke.
 *
 * Två lager som svarar på olika frågor:
 *  - Albacross (efter samtycke): vilka organisationer tittar? Fångar trafik vi
 *    inte själva initierat — vidarebefordrade länkar, sökträffar, kollegor.
 *  - VisitTracker (?k=): öppnade den vi skickade länken till, och läste de
 *    klart? Skriver mot prospect-raden i CRM:et.
 *
 * Medvetet INTE på /rektor/deck: det är presentationsläget John själv kör, och
 * hans egna besök hör inte hemma i statistiken.
 */
export function CampaignTracking({ page }: { page: 'rektor' | 'larare' }) {
  return (
    <>
      <AlbacrossSiteId />
      <CookieConsent locale="sv" />
      <VisitTracker page={page} />
    </>
  );
}
