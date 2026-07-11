'use server';

import { headers } from 'next/headers';
import { Resend } from 'resend';
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
function escape(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

  // Mejl via Resend (graceful fallback om nyckel saknas)
  const apiKey = process.env.RESEND_API_KEY;
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://www.elevante.se';
  const link = `${base}/${locale}/try`;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const sv = locale === 'sv';
      const subject = sv
        ? `${senderName} tror att Elevante kan vara något för dig`
        : `${senderName} thinks Elevante might be for you`;
      const greeting = message ? `<p>${escape(message)}</p>` : '';
      const html = sv
        ? `<p>Hej!</p><p>${escape(senderName)} har testat Elevante och ville tipsa dig.</p>${greeting}<p><a href="${link}">Prova själv — ingen inloggning</a></p>`
        : `<p>Hi!</p><p>${escape(senderName)} tried Elevante and wanted to share it with you.</p>${greeting}<p><a href="${link}">Try it yourself — no sign-in</a></p>`;
      await resend.emails.send({
        from: 'Elevante <hej@elevante.se>',
        to: recipientEmail,
        replyTo: senderEmail,
        subject,
        html,
      });
    } catch (err) {
      console.error('[try-share] Resend error:', err);
      // fäller inte — loggen är redan gjord
    }
  } else {
    console.info('[try-share] Resend not configured, logging only:', record);
  }

  // Notion best-effort
  try {
    await logShareToNotion(record);
  } catch (err) {
    console.error('[try-share] Notion error:', err);
  }

  return { status: 'success', recipient: recipientEmail };
}
