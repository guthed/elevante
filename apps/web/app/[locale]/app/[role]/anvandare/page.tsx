import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { Avatar } from '@/components/ui/Avatar';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getAdminUsers, type AdminUserRow } from '@/lib/data/admin';
import { UserRoleForm } from './UserRoleForm';

type Props = {
  params: Promise<{ locale: string; role: string }>;
  searchParams: Promise<{ filter?: string; q?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.admin.users.title,
    robots: { index: false, follow: false },
  };
}

// Editorial Calm — Stitch screen 15-admin-anvandare.png

export default async function AdminUsersPage({ params, searchParams }: Props) {
  const { locale: rawLocale, role } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'admin') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') redirect(`/${locale}/app`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.admin.users;
  const sv = locale === 'sv';
  const { filter, q } = await searchParams;

  const all = await getAdminUsers();

  const counts = {
    all: all.length,
    student: all.filter((u) => u.role === 'student').length,
    teacher: all.filter((u) => u.role === 'teacher').length,
    admin: all.filter((u) => u.role === 'admin').length,
  };

  let users: AdminUserRow[] = all;
  if (filter === 'student' || filter === 'teacher' || filter === 'admin') {
    users = users.filter((u) => u.role === filter);
  }
  if (q && q.trim().length > 0) {
    const needle = q.toLowerCase();
    users = users.filter(
      (u) =>
        (u.full_name ?? '').toLowerCase().includes(needle) ||
        (u.email ?? '').toLowerCase().includes(needle),
    );
  }

  const base = `/${locale}/app/admin/anvandare`;
  const fmtNumber = (n: number) =>
    new Intl.NumberFormat(locale === 'sv' ? 'sv-SE' : 'en-GB').format(n);

  return (
    <div className="container-wide py-10 md:py-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
            {sv ? 'Användare' : 'Users'}
          </h1>
          <p className="mt-2 text-[0.875rem] text-[var(--color-ink-muted)]">
            {fmtNumber(counts.all)}{' '}
            {sv
              ? counts.all === 1
                ? 'användare totalt'
                : 'användare totalt'
              : counts.all === 1
                ? 'user total'
                : 'users total'}
          </p>
        </div>
      </header>

      {/* Search + invite */}
      <form className="mt-8 flex flex-wrap items-center gap-3" action={base}>
        <div className="relative flex-1 min-w-[280px]">
          <span
            aria-hidden="true"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder={
              sv
                ? 'Sök efter namn eller e-post…'
                : 'Search name or email…'
            }
            className="w-full rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] py-2.5 pl-11 pr-4 text-[0.9375rem] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-ink-secondary)] focus:bg-[var(--color-surface)] focus:outline-none"
          />
        </div>
        {filter ? <input type="hidden" name="filter" value={filter} /> : null}
        <button
          type="submit"
          className="hidden rounded-[12px] bg-[var(--color-ink)] px-5 py-2.5 text-[0.875rem] font-medium text-[var(--color-canvas)] md:inline-flex"
        >
          {sv ? 'Sök' : 'Search'}
        </button>
      </form>

      {/* Filter chips */}
      <nav className="mt-6 flex flex-wrap gap-2">
        <FilterChip
          href={`${base}${q ? `?q=${encodeURIComponent(q)}` : ''}`}
          active={!filter}
          label={sv ? 'Alla' : 'All'}
          count={counts.all}
        />
        <FilterChip
          href={`${base}?filter=student${q ? `&q=${encodeURIComponent(q)}` : ''}`}
          active={filter === 'student'}
          label={sv ? 'Elever' : 'Students'}
          count={counts.student}
        />
        <FilterChip
          href={`${base}?filter=teacher${q ? `&q=${encodeURIComponent(q)}` : ''}`}
          active={filter === 'teacher'}
          label={sv ? 'Lärare' : 'Teachers'}
          count={counts.teacher}
        />
        <FilterChip
          href={`${base}?filter=admin${q ? `&q=${encodeURIComponent(q)}` : ''}`}
          active={filter === 'admin'}
          label="Admin"
          count={counts.admin}
        />
      </nav>

      {/* User list */}
      <section className="mt-10">
        {users.length === 0 ? (
          <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
            {q
              ? sv
                ? `Ingen användare matchar "${q}".`
                : `No user matches "${q}".`
              : labels.empty}
          </p>
        ) : (
          <div className="overflow-hidden rounded-[20px] bg-[var(--color-surface)]">
            <div className="hidden grid-cols-12 gap-4 border-b border-[var(--color-sand)] px-6 py-3 text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)] md:grid">
              <span className="col-span-5">
                {sv ? 'Namn' : 'Name'}
              </span>
              <span className="col-span-3">{sv ? 'Roll' : 'Role'}</span>
              <span className="col-span-4 text-right">
                {sv ? 'Ändra roll' : 'Change role'}
              </span>
            </div>
            <ul>
              {users.map((user) => (
                <li
                  key={user.id}
                  className="grid grid-cols-1 items-center gap-4 border-b border-[var(--color-sand)] px-6 py-4 last:border-b-0 md:grid-cols-12"
                >
                  <div className="md:col-span-5">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={user.full_name ?? user.email ?? '?'}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[0.9375rem] font-medium text-[var(--color-ink)]">
                          {user.full_name ?? '—'}
                        </p>
                        <p className="truncate text-[0.8125rem] text-[var(--color-ink-muted)]">
                          {user.email ?? '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <RolePill role={user.role} sv={sv} />
                  </div>
                  <div className="md:col-span-4 md:text-right">
                    <UserRoleForm
                      userId={user.id}
                      currentRole={user.role}
                      labels={labels}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <a
      href={href}
      className={[
        'inline-flex items-center gap-2 rounded-[12px] border px-3.5 py-1.5 text-[0.875rem] transition-colors',
        active
          ? 'border-transparent bg-[var(--color-sand)]/50 text-[var(--color-ink)]'
          : 'border-[var(--color-sand)] bg-[var(--color-canvas)] text-[var(--color-ink-secondary)] hover:border-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]',
      ].join(' ')}
    >
      <span>{label}</span>
      <span className="text-[0.75rem] text-[var(--color-ink-muted)]">
        {count}
      </span>
    </a>
  );
}

function RolePill({ role, sv }: { role: AdminUserRow['role']; sv: boolean }) {
  const label =
    role === 'student'
      ? sv
        ? 'Elev'
        : 'Student'
      : role === 'teacher'
        ? sv
          ? 'Lärare'
          : 'Teacher'
        : 'Admin';
  return (
    <span className="inline-flex items-center rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-3 py-1 text-[0.8125rem] text-[var(--color-ink)]">
      {label}
    </span>
  );
}
