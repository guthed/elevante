import { Resend } from 'resend';

type Meta = { locale?: string; maxScroll?: number };

function escapeHtml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Mejlar John när en investerare öppnar decket ('open') eller når the ask ('ask').
 * Graceful fallback: saknas RESEND_API_KEY loggas bara (inget kast).
 */
export async function notifyInvestorEvent(
  kind: 'open' | 'ask',
  label: string,
  meta: Meta = {},
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  // Investerarnotiser går alltid till john@elevante.se (ärver inte CONTACT_TO_EMAIL,
  // som kan peka på en annan inbox). Kan överstyras med INVESTOR_NOTIFY_EMAIL.
  const to = process.env.INVESTOR_NOTIFY_EMAIL ?? 'john@elevante.se';
  const headline =
    kind === 'open' ? `${label} öppnade investerardecket` : `${label} nådde "the ask"`;

  if (!apiKey) {
    console.info('[investor-notify] Resend not configured, logging only:', { kind, label, meta });
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const rows = [
      `<h2>${escapeHtml(headline)}</h2>`,
      `<p><strong>Investerare:</strong> ${escapeHtml(label)}</p>`,
      meta.locale ? `<p><strong>Språk:</strong> ${escapeHtml(meta.locale)}</p>` : '',
      typeof meta.maxScroll === 'number'
        ? `<p><strong>Scroll-djup:</strong> ${meta.maxScroll}%</p>`
        : '',
    ];
    await resend.emails.send({
      from: 'Elevante <hej@elevante.se>',
      to,
      subject: `Investerardeck · ${headline}`,
      html: rows.filter(Boolean).join('\n'),
    });
  } catch (error) {
    console.error('[investor-notify] Resend error:', error);
  }
}
