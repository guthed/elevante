import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { allow, clientKey } from '@/lib/try/ratelimit';
import { isVisitPage, signVisitToken } from '@/lib/school-visit';
import { notifySchoolVisit } from '@/lib/school-visit-notify';

const schema = z.object({
  code: z.string().min(4).max(32),
  page: z.string().refine(isVisitPage),
});

type CodeRow = { prospect_id: string; school_name: string; notion_page_id: string | null };
type OpenRow = { is_new_visit: boolean };

/**
 * Löser in en personlig besökskod (?k=) och startar en session. Svarar alltid
 * 204 på okända koder — endpointen ska inte kunna användas för att lista vilka
 * koder som finns.
 */
export async function POST(request: Request) {
  if (!allow(clientKey(request, 'skolbesok'), 20, 60_000)) {
    return new NextResponse(null, { status: 204 });
  }

  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(await request.json());
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  // Spårning får aldrig störa sidan: allt nedan degraderar till 204, oavsett
  // om det är en okänd kod, saknad konfiguration eller Supabase som strular.
  try {
    const supabase = await createSupabaseServerClient();
    const rpc = supabase as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
    };

    const { data: codeData } = await rpc.rpc('verify_school_visit_code', { p_code: parsed.code });
    const match = (codeData as CodeRow[] | null)?.[0];
    if (!match) return new NextResponse(null, { status: 204 });

    const sid = crypto.randomUUID();
    const { data: openData } = await rpc.rpc('record_school_visit_open', {
      p_prospect_id: match.prospect_id,
      p_session_id: sid,
      p_page: parsed.page,
    });
    const isNew = (openData as OpenRow[] | null)?.[0]?.is_new_visit ?? false;

    // Mejlet får inte hålla upp svaret — telemetrin ska börja mäta direkt.
    if (isNew) {
      after(async () => {
        await notifySchoolVisit(match.school_name, parsed.page);
        await rpc.rpc('mark_school_visit_notified', { p_session_id: sid });
      });
    }

    const token = await signVisitToken({
      sid,
      prospectId: match.prospect_id,
      school: match.school_name,
      page: parsed.page,
      pid: match.notion_page_id,
    });
    if (!token) return new NextResponse(null, { status: 204 });

    return NextResponse.json({ token });
  } catch (error) {
    console.error('[skolbesok] kunde inte starta session:', error);
    return new NextResponse(null, { status: 204 });
  }
}
