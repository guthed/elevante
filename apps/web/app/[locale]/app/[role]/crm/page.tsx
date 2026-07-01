import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getProspects } from '@/lib/data/admin';
import { CrmSearch } from '@/components/app/admin/CrmSearch';
import { CrmProspectList } from '@/components/app/admin/CrmProspectList';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.admin.crm.title,
    robots: { index: false, follow: false },
  };
}

export default async function AdminCrmPage({ params }: Props) {
  const { locale: rawLocale, role } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'admin') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') redirect(`/${locale}/app`);

  const dict = await getDictionary(locale);
  const t = dict.app.pages.admin.crm;
  const prospects = await getProspects();

  return (
    <div className="container-wide space-y-10 py-10 md:py-14">
      <header>
        <h1 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
          {t.title}
        </h1>
        <p className="mt-2 text-[0.875rem] text-[var(--color-ink-muted)]">{t.subtitle}</p>
      </header>

      <CrmSearch
        dict={{
          searchLabel: t.searchLabel,
          searchPlaceholder: t.searchPlaceholder,
          sync: t.sync,
        }}
      />

      <section>
        <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">
          {t.synced}
        </h2>
        <div className="mt-6">
          <CrmProspectList
            items={prospects}
            dict={{ synced: t.synced, empty: t.empty, openNotion: t.openNotion, cols: t.cols }}
          />
        </div>
      </section>
    </div>
  );
}
