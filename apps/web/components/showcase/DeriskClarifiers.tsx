// Tre kompakta förtydligande designelement för §17b De-risking.
// Rent presentationella (ingen state) → server-komponenter. Varje element
// sitter längst ned i sitt kort och kristalliserar kortets poäng visuellt.

const DIVIDER = 'mt-5 border-t border-ink/10 pt-5';

/** Kort 1 — tre bevispunkter med sage-prickar (trygghet). */
export function ProofTicks({ items }: { items: string[] }) {
  return (
    <ul className={`${DIVIDER} flex flex-col gap-2.5`}>
      {items.map((it) => (
        <li key={it} className="flex items-start gap-2.5 text-sm text-ink">
          <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-sage-deep" aria-hidden />
          {it}
        </li>
      ))}
    </ul>
  );
}

/** Kort 2 — horisontell riskskala, sage→coral, med Elevante-markör. */
export function MiniRiskScale({
  steps,
  note,
  ariaLabel,
}: {
  /** Ordnade tryggast→mest reglerat (vänster→höger). */
  steps: { level: string; isElevante?: boolean }[];
  note: string;
  ariaLabel?: string;
}) {
  const n = steps.length;
  const idx = Math.max(0, steps.findIndex((s) => s.isElevante));
  const pos = ((idx + 0.5) / n) * 100;
  const first = steps[0]?.level ?? '';
  const last = steps[n - 1]?.level ?? '';

  return (
    <div className={DIVIDER}>
      <div role="img" aria-label={ariaLabel ?? note}>
        <div className="relative pt-7">
          {/* Markör-pill ovanför skalan */}
          <span
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-canvas shadow-soft"
            style={{ left: `${pos}%` }}
          >
            {steps[idx]?.isElevante ? 'Elevante' : ''}
          </span>
          {/* Spår */}
          <div
            className="h-2 w-full rounded-full"
            style={{
              background:
                'linear-gradient(90deg, var(--color-sage-deep) 0%, rgba(184,197,166,0.6) 30%, rgba(255,122,107,0.55) 70%, var(--color-coral) 100%)',
            }}
          />
          {/* Prick på spåret */}
          <span
            className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas bg-ink"
            style={{ left: `${pos}%`, top: 'calc(1.75rem + 4px)' }}
            aria-hidden
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-ink-muted">
          <span>{first}</span>
          <span>{last}</span>
        </div>
      </div>
      <p className="mt-3 text-sm text-ink-muted">{note}</p>
    </div>
  );
}

/** Kort 3 — kontrast: branschen (coral ✗) vs Elevante (sage ✓). */
export function EvidenceContrast({ bad, good }: { bad: string; good: string }) {
  return (
    <div className={`${DIVIDER} flex flex-col gap-2.5 text-sm`}>
      <p className="flex items-start gap-2.5 text-ink-muted">
        <span className="mt-px flex-none font-serif text-base text-coral" aria-hidden>✕</span>
        {bad}
      </p>
      <p className="flex items-start gap-2.5 font-medium text-ink">
        <span className="mt-px flex-none font-serif text-base text-sage-deep" aria-hidden>✓</span>
        {good}
      </p>
    </div>
  );
}
