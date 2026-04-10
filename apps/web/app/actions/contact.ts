'use server';

import { headers } from 'next/headers';
import { Resend } from 'resend';

export type ContactState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'missing' | 'rate-limit' | 'generic' };

type IpRecord = { count: number; firstSeen: number };

// In-memory rate limit. Fluid Compute återanvänder instanser så detta
// räcker i Fas 0 (Resend + formulär är lågfrekvens). Byts mot Redis i Fas 2.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const ipLog = new Map<string, IpRecord>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipLog.get(ip);
  if (!entry || now - entry.firstSeen > WINDOW_MS) {
    ipLog.set(ip, { count: 1, firstSeen: now });
    return false;
  }
  entry.count += 1;
  if (entry.count > MAX_PER_WINDOW) return true;
  return false;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // Honeypot — bots fyller ofta i dolda fält
  const honeypot = formData.get('website');
  if (typeof honeypot === 'string' && honeypot.length > 0) {
    return { status: 'success' };
  }

  const name = (formData.get('name') ?? '').toString().trim();
  const email = (formData.get('email') ?? '').toString().trim();
  const school = (formData.get('school') ?? '').toString().trim();
  const topic = (formData.get('topic') ?? 'other').toString().trim();
  const message = (formData.get('message') ?? '').toString().trim();

  if (!name || !email || !school || !message || !isEmail(email)) {
    return { status: 'error', code: 'missing' };
  }

  const headerList = await headers();
  const ip =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerList.get('x-real-ip') ??
    'unknown';
  if (isRateLimited(ip)) {
    return { status: 'error', code: 'rate-limit' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL ?? 'john@guthed.se';

  // Om Resend inte är konfigurerat: logga till server-konsolen och
  // behandla som success. Används under lokal utveckling innan
  // RESEND_API_KEY är satt.
  if (!apiKey) {
    console.info('[contact] Resend not configured, logging only:', {
      name,
      email,
      school,
      topic,
      message,
    });
    return { status: 'success' };
  }

  try {
    const resend = new Resend(apiKey);
    const subject = `Elevante-kontakt: ${topic} – ${name}`;
    const html = `
      <h2>Nytt meddelande från elevante.se</h2>
      <p><strong>Namn:</strong> ${escape(name)}</p>
      <p><strong>E-post:</strong> ${escape(email)}</p>
      <p><strong>Skola/organisation:</strong> ${escape(school)}</p>
      <p><strong>Ämne:</strong> ${escape(topic)}</p>
      <p><strong>Meddelande:</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit">${escape(message)}</pre>
    `;

    await resend.emails.send({
      from: 'Elevante <hej@elevante.se>',
      to,
      replyTo: email,
      subject,
      html,
    });

    return { status: 'success' };
  } catch (error) {
    console.error('[contact] Resend error:', error);
    return { status: 'error', code: 'generic' };
  }
}
