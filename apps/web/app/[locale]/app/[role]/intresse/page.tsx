import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getCampaignProspects } from '@/lib/data/admin';
import type { SchoolProspect } from '@/lib/supabase/database';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: locale === 'sv' ? 'Intresseanmälningar — Admin' : 'Prospects — Admin',
    robots: { index: false, follow: false },
  };
}

export default async function AdminIntressePage({ params }: Props) {
  const { locale: rawLocale, role } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'admin') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') redirect(`/${locale}/app`);

  await getDictionary(locale);
  const { prospects, total } = await getCampaignProspects();
  const sv = locale === 'sv';

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(sv ? 'sv-SE' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="container-wide py-10 md:py-14">
      <header>
        <h1 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
          {sv ? 'Intresseanmälningar' : 'Prospects'}
        </h1>
        <p className="mt-2 text-[0.875rem] text-[var(--color-ink-muted)]">
          {sv
            ? `${total} skola${total === 1 ? '' : 'r'} har gjort en prisförfrågan. Prospekten speglas även till Notion.`
            : `${total} school${total === 1 ? '' : 's'} have requested a price estimate. Prospects are also synced to Notion.`}
        </p>
      </header>

      {prospects.length === 0 ? (
        <p className="mt-12 text-[0.9375rem] text-[var(--color-ink-muted)]">
          {sv ? 'Inga intresseanmälningar ännu.' : 'No prospects yet.'}
        </p>
      ) : (
        <ul className="mt-10 space-y-5">
          {prospects.map((p) => (
            <ProspectCard key={p.id} prospect={p} sv={sv} fmtDate={fmtDate} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProspectCard({
  prospect: p,
  sv,
  fmtDate,
}: {
  prospect: SchoolProspect;
  sv: boolean;
  fmtDate: (iso: string) => string;
}) {
  const hasLead = Boolean(p.latest_lead_email);
  const contactParts = [p.contact_phone, p.contact_email, p.contact_address].filter(
    Boolean,
  );

  return (
    <li className="rounded-[20px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-6 md:p-8">
      {/* Top row: name + badges */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-[1.25rem] leading-snug text-[var(--color-ink)]">
            {p.school_name}
          </h2>
          {p.municipality && (
            <p className="mt-0.5 text-[0.875rem] text-[var(--color-ink-muted)]">
              {p.municipality}
              {p.huvudman_name ? ` · ${p.huvudman_name}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasLead && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-sage)] bg-[var(--color-sage)]/20 px-3 py-1 text-[0.75rem] text-[var(--color-ink)]">
              <span className="status-dot status-dot--sage" aria-hidden="true" />
              {sv ? 'Kontaktuppgift lämnad' : 'Contact info provided'}
            </span>
          )}
          <EnrichmentBadge status={p.enrichment_status} sv={sv} />
        </div>
      </div>

      {/* Stats row */}
      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
        {p.students != null && (
          <Dt
            label={sv ? 'Elever' : 'Students'}
            value={new Intl.NumberFormat(sv ? 'sv-SE' : 'en-GB').format(p.students)}
          />
        )}
        <Dt
          label={sv ? 'Uppslag' : 'Lookups'}
          value={String(p.lookup_count)}
        />
        <Dt
          label={sv ? 'Senast sedd' : 'Last seen'}
          value={fmtDate(p.last_seen_at)}
        />
        <Dt
          label={sv ? 'Första uppslag' : 'First seen'}
          value={fmtDate(p.first_seen_at)}
        />
      </dl>

      {/* Contact */}
      {contactParts.length > 0 && (
        <p className="mt-4 text-[0.875rem] text-[var(--color-ink-secondary)]">
          <span className="font-medium text-[var(--color-ink)]">
            {sv ? 'Kontakt:' : 'Contact:'}
          </span>{' '}
          {contactParts.join(' · ')}
        </p>
      )}

      {/* Lead email */}
      {p.latest_lead_email && (
        <p className="mt-2 text-[0.875rem] text-[var(--color-ink-secondary)]">
          <span className="font-medium text-[var(--color-ink)]">
            {sv ? 'Lead-e-post:' : 'Lead email:'}
          </span>{' '}
          {p.latest_lead_email}
        </p>
      )}

      {/* AI brief */}
      {p.ai_brief && (
        <blockquote className="mt-5 border-l-2 border-[var(--color-sand)] pl-4 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)] italic">
          {p.ai_brief}
        </blockquote>
      )}
    </li>
  );
}

function Dt({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.75rem] uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 font-serif text-[1rem] tabular-nums text-[var(--color-ink)]">
        {value}
      </dd>
    </div>
  );
}

function EnrichmentBadge({
  status,
  sv,
}: {
  status: 'pending' | 'done' | 'failed';
  sv: boolean;
}) {
  const map: Record<
    'pending' | 'done' | 'failed',
    { dot: string; label: string; labelEn: string }
  > = {
    pending: { dot: 'status-dot--sand', label: 'Anrikar', labelEn: 'Enriching' },
    done: { dot: 'status-dot--sage', label: 'Anrikad', labelEn: 'Enriched' },
    failed: { dot: 'status-dot--coral', label: 'Anrikning misslyckades', labelEn: 'Enrichment failed' },
  };
  const { dot, label, labelEn } = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-sand)] bg-[var(--color-canvas)] px-3 py-1 text-[0.75rem] text-[var(--color-ink-secondary)]">
      <span className={`status-dot ${dot}`} aria-hidden="true" />
      {sv ? label : labelEn}
    </span>
  );
}
