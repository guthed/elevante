import type { Metadata } from 'next';
import InvestorDeck from '../InvestorDeck';

export const metadata: Metadata = {
  title: { absolute: 'Elevante — investor deck' },
  description: 'Elevante pre-seed deck: the AI tutor that was in the room.',
  robots: { index: false, follow: false },
};

export default function InvestorPageEn() {
  return <InvestorDeck lang="en" />;
}
