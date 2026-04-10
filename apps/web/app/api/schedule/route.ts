import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';

// GET /api/schedule
// Returnerar aktuell användares schema (timeslots) för dennes skola.
// RLS säkerställer att varje användare bara ser sin egen skolas data.
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('timeslots')
    .select(
      'id, day, start_time, end_time, room, course_id, class_id, teacher_id',
    )
    .order('day', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { timeslots: data },
    {
      headers: {
        // Inget cachning — schemat är per-användare
        'Cache-Control': 'no-store',
      },
    },
  );
}
