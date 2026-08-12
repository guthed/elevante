// apps/web/app/api/cron/sokordsinsikter/route.ts
//
// Hämtar sökfrågor från Search Console + landningssidor från GA4 senaste 7 dagarna
// och skriver in dem som rader i Notion-databasen "Sökordsinsikter".
// Körs av Vercel Cron enligt schema i vercel.json.

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Client } from '@notionhq/client';

export const dynamic = 'force-dynamic';

const NOTION_TOKEN = process.env.NOTION_TOKEN!;
const NOTION_DB_ID = process.env.NOTION_SOKORDSINSIKTER_DB_ID!;
const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID!;
const GSC_SITE_URL = process.env.GSC_SITE_URL!; // t.ex. 'https://elevante.se/'

// GOOGLE_SERVICE_ACCOUNT_JSON_B64: hela service-account JSON base64-kodad
// (undviker \n-escapingproblem med private_key i Vercel env vars)
// Skapa: base64 -i service-account.json | tr -d '\n'
function buildAuth() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64!;
  const credentials = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/webmasters.readonly',
    ],
  });
}

const notion = new Client({ auth: NOTION_TOKEN });

export async function GET(req: Request) {
  // Skydda endpointen - Vercel Cron skickar denna header automatiskt
  // om CRON_SECRET är satt som env var.
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const auth = buildAuth();
  const period = lastNDays(7);

  const [gscRows, ga4Rows] = await Promise.all([
    fetchSearchConsole(period, auth),
    fetchGA4(period, auth),
  ]);

  const results = await Promise.allSettled([
    ...gscRows.map((row) =>
      upsertNotionRow(
        { name: row.query, clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position },
        'Search Console',
        'Sökfråga',
        period
      )
    ),
    ...ga4Rows.map((row) =>
      upsertNotionRow(
        { name: row.landingPage, clicks: row.sessions, impressions: null, ctr: row.engagementRate, position: null },
        'GA4',
        'Landningssida',
        period
      )
    ),
  ]);

  const failed = results.filter((r) => r.status === 'rejected').length;

  return NextResponse.json({
    ok: failed === 0,
    period,
    gsc_rows: gscRows.length,
    ga4_rows: ga4Rows.length,
    failed_writes: failed,
  });
}

function lastNDays(n: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - n);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

type GscRow = { query: string; clicks: number; impressions: number; ctr: number; position: number };
type Ga4Row = { landingPage: string; sessions: number; engagementRate: number };

async function fetchSearchConsole(period: { start: string; end: string }, auth: ReturnType<typeof buildAuth>): Promise<GscRow[]> {
  const searchconsole = google.searchconsole({ version: 'v1', auth });
  const res = await searchconsole.searchanalytics.query({
    siteUrl: GSC_SITE_URL,
    requestBody: {
      startDate: period.start,
      endDate: period.end,
      dimensions: ['query'],
      rowLimit: 100,
    },
  });
  return (res.data.rows ?? []).map((r) => ({
    query: r.keys?.[0] ?? '',
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }));
}

async function fetchGA4(period: { start: string; end: string }, auth: ReturnType<typeof buildAuth>): Promise<Ga4Row[]> {
  const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });
  const res = await analyticsdata.properties.runReport({
    property: `properties/${GA4_PROPERTY_ID}`,
    requestBody: {
      dateRanges: [{ startDate: period.start, endDate: period.end }],
      dimensions: [{ name: 'landingPage' }],
      metrics: [{ name: 'sessions' }, { name: 'engagementRate' }],
      limit: '100',
    },
  });
  return (res.data.rows ?? []).map((r) => ({
    landingPage: r.dimensionValues?.[0]?.value ?? '',
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
    engagementRate: Number(r.metricValues?.[1]?.value ?? 0),
  }));
}

async function upsertNotionRow(
  row: { name: string; clicks: number | null; impressions: number | null; ctr: number | null; position: number | null },
  källa: 'Search Console' | 'GA4',
  typ: 'Sökfråga' | 'Landningssida',
  period: { start: string; end: string }
) {
  if (!row.name) return;
  await notion.pages.create({
    parent: { database_id: NOTION_DB_ID },
    properties: {
      'Sökfråga / Sida': { title: [{ text: { content: row.name.slice(0, 200) } }] },
      Källa: { select: { name: källa } },
      Typ: { select: { name: typ } },
      Klick: { number: row.clicks },
      Visningar: { number: row.impressions },
      CTR: { number: row.ctr },
      Position: { number: row.position },
      Status: { select: { name: 'Ny' } },
      Period: { date: { start: period.start, end: period.end } },
    },
  });
}
