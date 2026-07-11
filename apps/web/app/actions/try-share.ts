'use server';

import { headers } from 'next/headers';
import { sendLoopsTransactional } from '@/lib/loops';
import {
  insertShare,
  shareCountLastHour,
  logShareToNotion,
  type ShareRecord,
} from '@/lib/try/share-log';

export type ShareState =
  | { status: 'idle' }
  | { status: 'success'; recipient: string }
  | { status: 'error'; code: 'missing' | 'rate-limit' | 'generic' };

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

const MAX_PER_HOUR = 5;

export async function shareTry(
  _prev: ShareState,
  formData: FormData,
): Promise<ShareState> {
  // Honeypot — bots fyller ofta i dolda fält
  const honeypot = formData.get('website');
  if (typeof honeypot === 'string' && honeypot.length > 0) {
    return { status: 'success', recipient: '' };
  }

  const senderName = (formData.get('senderName') ?? '').toString().trim().slice(0, 100);
  const senderEmail = (formData.get('senderEmail') ?? '').toString().trim();
  const recipientEmail = (formData.get('recipientEmail') ?? '').toString().trim();
  const message = (formData.get('message') ?? '').toString().trim().slice(0, 500);
  const locale = (formData.get('locale') ?? 'sv').toString() === 'en' ? 'en' : 'sv';

  if (!senderName || !isEmail(senderEmail) || !isEmail(recipientEmail)) {
    return { status: 'error', code: 'missing' };
  }
  if (senderEmail.toLowerCase() === recipientEmail.toLowerCase()) {
    return { status: 'error', code: 'missing' };
  }

  const headerList = await headers();
  const ip =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerList.get('x-real-ip') ??
    'unknown';

  if (ip !== 'unknown' && (await shareCountLastHour(ip)) >= MAX_PER_HOUR) {
    return { status: 'error', code: 'rate-limit' };
  }

  const record: ShareRecord = {
    senderName,
    senderEmail,
    recipientEmail,
    message: message || null,
    locale,
    ip,
  };

  // Primär logg — fäller vid fel
  try {
    await insertShare(record);
  } catch (err) {
    console.error('[try-share] insert error:', err);
    return { status: 'error', code: 'generic' };
  }

  // Mejl via Loops (best-effort — Supabase är loggen). Copy bor i Loops-mallen;
  // koden skickar bara data. Reply-to = avsändaren (satt som {{senderEmail}} i mallen).
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://www.elevante.se';
  const url = `${base}/${locale}/try`;
  const templateId =
    locale === 'en'
      ? process.env.LOOPS_SHARE_TRANSACTIONAL_ID_EN
      : process.env.LOOPS_SHARE_TRANSACTIONAL_ID_SV;
  await sendLoopsTransactional(templateId, recipientEmail, {
    senderName,
    message,
    url,
    senderEmail,
  });

  // Notion best-effort
  try {
    await logShareToNotion(record);
  } catch (err) {
    console.error('[try-share] Notion error:', err);
  }

  return { status: 'success', recipient: recipientEmail };
}
