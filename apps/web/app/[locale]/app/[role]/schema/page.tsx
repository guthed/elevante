import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile, createSupabaseServerClient } from '@/lib/supabase/server';
import { PageWrapper } from '@/components/app/PageWrapper';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { ScheduleUploadForm } from './ScheduleUploadForm';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.admin.schedule.title,
    robots: { index: false, follow: false },
  };
}

type TimeslotRow = {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  room: string | null;
};

export default async function AdminSchedulePage({ params }: Props) {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  if (role !== 'admin') redirect(`/${locale}/app/${role}`);

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    redirect(`/${locale}/app`);
  }

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.admin.schedule;

  const supabase = await createSupabaseServerClient();
  const { data: timeslots } = await supabase
    .from('timeslots')
    .select('id, day, start_time, end_time, room')
    .order('day', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(100);

  const rows: TimeslotRow[] = (timeslots as TimeslotRow[] | null) ?? [];

  return (
    <PageWrapper title={labels.title} subtitle={labels.subtitle}>
      <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
        <Card>
          <ScheduleUploadForm labels={labels} />
        </Card>
        <Card padded={false}>
          {rows.length === 0 ? (
            <EmptyState title={labels.tableEmpty} className="border-0 bg-transparent" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-ink-subtle)]">
                  <tr>
                    <th className="px-6 py-4">Day</th>
                    <th className="px-6 py-4">Start</th>
                    <th className="px-6 py-4">End</th>
                    <th className="px-6 py-4">Room</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((slot) => (
                    <tr
                      key={slot.id}
                      className="border-b border-[var(--color-border)] last:border-0"
                    >
                      <td className="px-6 py-3 text-[var(--color-primary)]">{slot.day}</td>
                      <td className="px-6 py-3">{slot.start_time}</td>
                      <td className="px-6 py-3">{slot.end_time}</td>
                      <td className="px-6 py-3">{slot.room ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}
