import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) return {};
  const dict = await getDictionary(locale);
  return {
    title: `${dict.app.roleTitles[role]} · ${dict.app.pages[role].overview.title}`,
    robots: { index: false, follow: false },
  };
}

export default async function RoleOverviewPage({ params }: Props) {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  const dict = await getDictionary(locale);
  const overview = dict.app.pages[role].overview;
  const base = `/${locale}`;

  return (
    <PageWrapper
      title={overview.title}
      subtitle={overview.subtitle}
      actions={
        <>
          <Badge tone="accent">{dict.app.common.comingSoon}</Badge>
          <LinkButton href={base} variant="ghost" size="sm">
            ← {dict.nav.home}
          </LinkButton>
        </>
      }
    >
      <EmptyState title={overview.emptyTitle} description={overview.emptyBody} />
    </PageWrapper>
  );
}
