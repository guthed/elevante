import type { Metadata } from 'next';
import InvestorDeck from './InvestorDeck';

export const metadata: Metadata = {
  title: { absolute: 'Elevante — investerardeck' },
  description: 'Elevantes pre-seed-deck: AI-handledaren som var i rummet.',
  robots: { index: false, follow: false },
};

export default function InvestorPageSv() {
  return <InvestorDeck lang="sv" />;
}
