import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { MAX_BACKFILL_PER_REQUEST } from '@/lib/data/training';

// POST /api/training/progress
// Pollas av OvaPicker medan startTrainingSession() kör backfill av
// träningsunderlag i bakgrunden. Räknar bara — startar aldrig själv någon
// generering, så polling är billigt och ofarligt att upprepa.
//
// `total` är hur många av de begärda lektionerna som KOMMER ha underlag när
// den pågående requesten är klar, givet backfill-taket per request
// (MAX_BACKFILL_PER_REQUEST). Klienten fångar detta värde vid första lyckade
// pollningen och håller det fast — räknas det om varje gång sjunker `missing`
// i takt med att `ready` växer, vilket får taket att krypa uppåt tillsammans
// med räknaren och aldrig visa en stabil nämnare.

const Body = z.object({
  lessonIds: z.array(z.string().uuid()).min(1).max(50),
});

export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const parsed = Body.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const { lessonIds } = parsed.data;

  // RLS-scopad klient (inte service-role) — en elev ska bara kunna räkna
  // underlag för lektioner hon själv har åtkomst till.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('training_materials')
    .select('lesson_id')
    .in('lesson_id', lessonIds);

  if (error) {
    return NextResponse.json({ error: 'generic' }, { status: 500 });
  }

  const ready = new Set((data ?? []).map((row) => row.lesson_id)).size;
  const missing = lessonIds.length - ready;
  const total = ready + Math.min(missing, MAX_BACKFILL_PER_REQUEST);

  return NextResponse.json(
    { ready, total },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
