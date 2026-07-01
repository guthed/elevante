import { NextResponse } from 'next/server';
import { getPageForEnrichment, resolveNotionUserName } from '@/lib/notion';
import { enrichNotionRowByName } from '@/lib/prospects';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.NOTION_ENRICH_TOKEN;
  const url = new URL(req.url);
  if (!secret || url.searchParams.get('token') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: unknown = {};
  try { body = await req.json(); } catch { /* tom/ogiltig body — hanteras nedan */ }
  const b = body as Record<string, unknown> & { data?: { id?: string }; page?: { id?: string }; source?: { id?: string }; id?: string };
  const pageId = b?.data?.id ?? b?.page?.id ?? b?.source?.id ?? b?.id ?? null;
  if (!pageId) return NextResponse.json({ error: 'no page id' }, { status: 400 });

  const page = await getPageForEnrichment(pageId);
  if (!page) return NextResponse.json({ error: 'page not found' }, { status: 404 });
  if (page.alreadySynced) return NextResponse.json({ skipped: 'redan synkad' });
  if (page.name.trim().length < 2) return NextResponse.json({ skipped: 'inget namn' });

  const ownerName = await resolveNotionUserName(page.ownerUserId);
  const result = await enrichNotionRowByName(pageId, page.name, ownerName);
  return NextResponse.json({ result });
}
