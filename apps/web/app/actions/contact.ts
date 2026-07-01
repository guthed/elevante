'use server';

import { headers } from 'next/headers';
import { after } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { syncProspect } from '@/lib/prospects';
import { sendLoopsTransactional } from '@/lib/loops';

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

// Kort deterministisk kod för kodlösa kontaktformulär-rader: samma person + skola
// → samma rad (ingen dubblett). Inte kryptografisk, bara stabil.
function contactCode(email: string, school: string): string {
  const s = `${email.toLowerCase()}|${school.toLowerCase()}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `contact-${(h >>> 0).toString(36)}`;
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

  // Persistens först (bara sälj-relevanta ämnen), mejl sekundärt.
  const isSalesLead = topic === 'demo' || topic === 'pricing';
  if (isSalesLead) {
    const code = contactCode(email, school);
    const now = new Date().toISOString();
    try {
      const supabase = createSupabaseServiceRoleClient();
      await supabase.from('school_prospects').upsert(
        { school_unit_code: code, school_name: school,
          latest_lead_email: email, latest_lead_message: message, latest_lead_at: now,
          created_via: 'contact_form', enrichment_status: 'done', updated_at: now },
        { onConflict: 'school_unit_code' },
      );
    } catch (err) {
      console.error('[contact] kunde inte spara prospect:', err);
    }
    after(async () => {
      try {
        await syncProspect({
          code, name: school, skolform: [], createdVia: 'contact_form',
          students: null, bumpLookup: false,
        });
      } catch (err) {
        console.error('[contact] syncProspect misslyckades:', err);
      }
    });
  }

  // Notis till John via Loops (alla ämnen).
  await sendLoopsTransactional(process.env.LOOPS_KONTAKT_NOTIS_ID, to, {
    name, email, school, topic, message, replyToAddress: email,
  });

  return { status: 'success' };
}
