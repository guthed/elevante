'use server';

import { headers } from 'next/headers';
import { sendLoopsTransactional } from '@/lib/loops';

export type ContactState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; code: 'missing' | 'rate-limit' | 'generic' };

type IpRecord = { count: number; firstSeen: number };

// In-memory rate limit. Fluid Compute återanvänder instanser så detta
// räcker i Fas 0 (mejl + formulär är lågfrekvens). Byts mot Redis i Fas 2.
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

  const to = process.env.CONTACT_TO_EMAIL ?? 'john@elevante.se';

  // Leveranskritiskt: kontaktformuläret har ingen DB-backup, så en miss måste
  // synas för användaren. Variablerna matchar Loops-mallen "Elevante — kontakt-notis".
  const ok = await sendLoopsTransactional(process.env.LOOPS_CONTACT_TRANSACTIONAL_ID, to, {
    topic,
    name,
    school,
    email,
    message,
  });
  if (!ok) return { status: 'error', code: 'generic' };
  return { status: 'success' };
}
