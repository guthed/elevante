import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getCurrentProfile } from '@/lib/supabase/server';

// Efter login landar man här. Vi läser profilens roll och
// skickar vidare till rätt /app/[role]-överblick.
// Om användaren saknar roll (t.ex. inget school_id kopplat än)
// landar de på student-vyn som default.
export default async function AppEntryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const profile = await getCurrentProfile();
  // Proxy skyddar redan denna rutt, men vi dubbelkollar.
  if (!profile) redirect(`/${locale}/login`);

  redirect(`/${locale}/app/${profile.role}`);
}
