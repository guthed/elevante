'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';

// Editorial Calm — interaktiv produktdemo: lärarens inspelning blir elevens svar.
// Klick navigerar mellan skärmarna utan riktig data. Demoflöde för säljare.

type Step = 'schedule' | 'recording' | 'processing' | 'chat' | 'done';

type Props = {
  locale: string;
};

const PHASES = {
  sv: ['Spela in', 'Lektionen minns', 'Eleven frågar'],
  en: ['Record', 'The lesson remembers', 'The student asks'],
} as const;

function phaseOf(step: Step): number {
  if (step === 'schedule' || step === 'recording') return 0;
  if (step === 'processing') return 1;
  return 2;
}

export function AppDemo({ locale }: Props) {
  const sv = locale === 'sv';
  const [step, setStep] = useState<Step>('schedule');
  const [chatAnswered, setChatAnswered] = useState(false);

  const restart = () => {
    setStep('schedule');
    setChatAnswered(false);
  };

  const isPhone =
    step === 'schedule' || step === 'recording' || step === 'processing';
  const phases = sv ? PHASES.sv : PHASES.en;

  return (
    <div>
      <ProgressRail phases={phases} active={phaseOf(step)} />

      <div className="mt-10 grid items-start gap-12 md:grid-cols-12 md:gap-16">
        {/* Enhet */}
        <div className="md:col-span-6">
          <div key={step} className="mx-auto max-w-[400px] animate-page-in">
            {isPhone ? (
              <PhoneFrame>
                {step === 'schedule' ? (
                  <ScheduleScreen sv={sv} onRecord={() => setStep('recording')} />
                ) : null}
                {step === 'recording' ? (
                  <RecordingScreen sv={sv} onStop={() => setStep('processing')} />
                ) : null}
                {step === 'processing' ? <ProcessingScreen sv={sv} /> : null}
              </PhoneFrame>
            ) : (
              <BrowserFrame>
                <ChatScreen
                  sv={sv}
                  answered={chatAnswered}
                  onSend={() => setChatAnswered(true)}
                />
              </BrowserFrame>
            )}
          </div>
        </div>

        {/* Berättelse */}
        <div className="md:col-span-6">
          <div className="sticky top-8">
            <p className="eyebrow mb-6">{sv ? 'Elevante-demo' : 'Elevante demo'}</p>

            {step === 'schedule' ? (
              <Narrative
                title={sv ? 'Läraren börjar dagen' : 'The teacher starts the day'}
                body={
                  sv
                    ? 'Schemat finns redan i appen — inga inställningar, ingen "vilken klass är detta?". Nästa lektion är en knapptryckning bort.'
                    : 'The schedule is already in the app — nothing to configure, no "which class is this?". The next lesson is one tap away.'
                }
                cta={sv ? 'Spela in nästa lektion →' : 'Record next lesson →'}
                onCta={() => setStep('recording')}
              />
            ) : null}

            {step === 'recording' ? (
              <Narrative
                title={sv ? 'En knapp. Spelar in.' : 'One button. Recording.'}
                body={
                  sv
                    ? 'Mörk skärm för att inte distrahera, stor stop-knapp. Läraren undervisar precis som vanligt — appen gör resten.'
                    : 'Dark screen to avoid distraction, big stop button. The teacher teaches exactly as usual — the app does the rest.'
                }
                cta={sv ? 'Stoppa inspelning →' : 'Stop recording →'}
                onCta={() => setStep('processing')}
              />
            ) : null}

            {step === 'processing' ? (
              <Narrative
                title={sv ? 'Lektionen sparar sig själv' : 'The lesson saves itself'}
                body={
                  sv
                    ? 'Ljudet laddas upp och transkriberas automatiskt. Råljudet raderas när texten finns — bara lektionen, som text, blir kvar.'
                    : 'The audio uploads and is transcribed automatically. Raw audio is deleted once the text exists — only the lesson, as text, remains.'
                }
                cta={sv ? 'Samma kväll, hemma hos en elev →' : 'That evening, at a student’s home →'}
                onCta={() => setStep('chat')}
              />
            ) : null}

            {step === 'chat' && !chatAnswered ? (
              <Narrative
                title={sv ? 'Eleven frågar hemma' : 'The student asks from home'}
                body={
                  sv
                    ? 'Eleven öppnar Elevante i webbläsaren och skriver en fråga om dagens lektion. Inget möte, ingen app att installera.'
                    : 'The student opens Elevante in the browser and types a question about today’s lesson. No meeting, no app to install.'
                }
                cta={sv ? 'Skicka frågan →' : 'Send the question →'}
                onCta={() => setChatAnswered(true)}
              />
            ) : null}

            {step === 'chat' && chatAnswered ? (
              <Narrative
                title={sv ? 'Svaret — med källa' : 'The answer — with a source'}
                body={
                  sv
                    ? 'Svaret kommer ur lärarens egen lektion, med ett källcitat tillbaka till exakt var det sas. Strikt RAG: aldrig en gissning.'
                    : 'The answer comes from the teacher’s own lesson, with a source citation back to exactly where it was said. Strict RAG: never a guess.'
                }
                cta={sv ? 'Vad demon visade →' : 'What the demo showed →'}
                onCta={() => setStep('done')}
              />
            ) : null}

            {step === 'done' ? (
              <ClosingNarrative sv={sv} locale={locale} onRestart={restart} />
            ) : null}

            {step !== 'schedule' && step !== 'done' ? (
              <button
                type="button"
                onClick={restart}
                className="mt-8 text-[0.875rem] text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
              >
                {sv ? '↺ Spela demo från början' : '↺ Restart demo'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Progressrad ───────────────────────────────────────────────── */
function ProgressRail({
  phases,
  active,
}: {
  phases: readonly string[];
  active: number;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {phases.map((label, i) => (
        <li key={label} className="flex items-center gap-3">
          <span
            className={[
              'flex h-6 w-6 items-center justify-center rounded-full text-[0.75rem] font-medium transition-colors',
              i < active
                ? 'bg-[var(--color-sage)] text-[var(--color-ink)]'
                : i === active
                  ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]'
                  : 'bg-[var(--color-sand)] text-[var(--color-ink-muted)]',
            ].join(' ')}
            aria-hidden="true"
          >
            {i < active ? '✓' : i + 1}
          </span>
          <span
            className={[
              'text-[0.875rem] transition-colors',
              i === active
                ? 'font-medium text-[var(--color-ink)]'
                : 'text-[var(--color-ink-muted)]',
            ].join(' ')}
          >
            {label}
          </span>
          {i < phases.length - 1 ? (
            <span
              className="hidden h-px w-8 bg-[var(--color-sand)] sm:block"
              aria-hidden="true"
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/* ── Enhetsramar ───────────────────────────────────────────────── */
function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative rounded-[44px] bg-[var(--color-ink)] p-3 shadow-[0_32px_80px_-24px_rgba(26,26,46,0.4)]">
      <div className="absolute left-1/2 top-3 z-20 h-6 w-32 -translate-x-1/2 rounded-b-[20px] bg-[var(--color-ink)]" />
      <div className="relative h-[680px] overflow-hidden rounded-[32px] bg-[var(--color-canvas)]">
        {children}
      </div>
    </div>
  );
}

function BrowserFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[var(--color-sand)] bg-[var(--color-surface)] shadow-[0_32px_80px_-24px_rgba(26,26,46,0.3)]">
      <div className="flex items-center gap-3 border-b border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-sand-strong)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-sand-strong)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-sand-strong)]" />
        </div>
        <div className="flex-1 rounded-[8px] bg-[var(--color-surface)] px-3 py-1 text-center text-[0.6875rem] text-[var(--color-ink-muted)]">
          elevante.se/app
        </div>
      </div>
      <div className="h-[600px] overflow-hidden">{children}</div>
    </div>
  );
}

/* ── Berättelse-block ──────────────────────────────────────────── */
function Narrative({
  title,
  body,
  cta,
  onCta,
}: {
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div>
      <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
        {title}
      </h2>
      <p className="mt-4 text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
        {body}
      </p>
      <button
        type="button"
        onClick={onCta}
        className="mt-8 inline-flex items-center gap-2 rounded-[12px] bg-[var(--color-ink)] px-5 py-3 text-[0.9375rem] font-medium text-[var(--color-canvas)] transition-opacity hover:opacity-90"
      >
        {cta}
      </button>
    </div>
  );
}

function ClosingNarrative({
  sv,
  locale,
  onRestart,
}: {
  sv: boolean;
  locale: string;
  onRestart: () => void;
}) {
  return (
    <div>
      <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
        {sv ? 'Det här är hela Elevante.' : 'This is all of Elevante.'}
      </h2>
      <p className="mt-4 text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
        {sv
          ? 'Två tryck för läraren blev ett svar för eleven — med källa rakt tillbaka till lektionen. Inget efterarbete, ingen gissning.'
          : 'Two taps for the teacher became an answer for the student — with a source straight back to the lesson. No follow-up work, no guessing.'}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link
          href={`/${locale}/kontakt?topic=demo`}
          className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--color-ink)] px-5 py-3 text-[0.9375rem] font-medium text-[var(--color-canvas)] transition-opacity hover:opacity-90"
        >
          {sv ? 'Boka demo' : 'Book demo'}
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className="text-[0.875rem] text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
        >
          {sv ? '↺ Spela demo från början' : '↺ Restart demo'}
        </button>
      </div>
    </div>
  );
}

/* ── Skärm: schema (telefon) ───────────────────────────────────── */
function ScheduleScreen({ sv, onRecord }: { sv: boolean; onRecord: () => void }) {
  const lessons = sv
    ? [
        { time: '08:15', end: '09:00', title: 'Algebraisk modellering', course: 'Matematik 4 · NA3a · A102', status: 'ready' },
        { time: '10:15', end: '11:00', title: 'Integralberäkning — del 2', course: 'Matematik 4 · NA3a · A102', status: 'waiting' },
        { time: '12:30', end: '13:15', title: 'Repetition inför prov', course: 'Matematik 3 · TE2c · A205', status: 'waiting' },
        { time: '14:00', end: '14:45', title: 'Derivata och optimering', course: 'Matematik 4 · NA3a · A102', status: 'waiting' },
      ]
    : [
        { time: '08:15', end: '09:00', title: 'Algebraic modelling', course: 'Math 4 · NA3a · A102', status: 'ready' },
        { time: '10:15', end: '11:00', title: 'Integrals — part 2', course: 'Math 4 · NA3a · A102', status: 'waiting' },
        { time: '12:30', end: '13:15', title: 'Test prep', course: 'Math 3 · TE2c · A205', status: 'waiting' },
        { time: '14:00', end: '14:45', title: 'Derivatives & optimization', course: 'Math 4 · NA3a · A102', status: 'waiting' },
      ];

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.75rem] text-[var(--color-ink-muted)]">
              {sv ? 'Tisdag 13 maj' : 'Tuesday May 13'}
            </p>
            <h1 className="mt-0.5 font-serif text-[1.75rem] leading-none text-[var(--color-ink)]">
              {sv ? 'Idag' : 'Today'}
            </h1>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-sand)] text-[0.6875rem] font-medium text-[var(--color-ink)]">
            AB
          </div>
        </div>
      </div>

      <ul className="mt-4 flex-1 overflow-y-auto">
        {lessons.map((lesson, idx) => (
          <li
            key={idx}
            className="flex items-center gap-3 border-t border-[var(--color-sand)] px-5 py-3.5 last:border-b"
          >
            <div className="w-12 shrink-0">
              <p className="font-serif text-[0.9375rem] leading-none text-[var(--color-ink)]">
                {lesson.time}
              </p>
              <p className="mt-1 text-[0.6875rem] text-[var(--color-ink-muted)]">
                {lesson.end}
              </p>
            </div>
            <div className="h-8 w-px bg-[var(--color-sand)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-[0.9375rem] leading-tight text-[var(--color-ink)]">
                {lesson.title}
              </p>
              <p className="mt-0.5 truncate text-[0.6875rem] text-[var(--color-ink-muted)]">
                {lesson.course}
              </p>
            </div>
            <span
              className={
                lesson.status === 'ready'
                  ? 'status-dot status-dot--sage'
                  : 'status-dot status-dot--sand'
              }
              aria-hidden="true"
            />
          </li>
        ))}
      </ul>

      <div className="px-4 pb-6 pt-4">
        <button
          type="button"
          onClick={onRecord}
          className="relative flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-ink)] text-[1rem] font-medium text-[var(--color-canvas)] shadow-[0_8px_24px_-8px_rgba(26,26,46,0.4)]"
        >
          <span
            className="absolute inset-0 -m-1.5 rounded-[18px] border-2 border-[var(--color-coral)]/60 coral-pulse"
            aria-hidden="true"
          />
          {sv ? 'Spela in nästa lektion' : 'Record next lesson'} →
        </button>

        <nav className="mt-4 flex items-center justify-around border-t border-[var(--color-sand)] pt-3">
          <span className="text-[0.75rem] font-medium text-[var(--color-ink)]">
            {sv ? 'Schema' : 'Schedule'}
          </span>
          <span className="text-[0.75rem] text-[var(--color-ink-muted)]">
            {sv ? 'Inspelningar' : 'Recordings'}
          </span>
          <span className="text-[0.75rem] text-[var(--color-ink-muted)]">
            {sv ? 'Inställningar' : 'Settings'}
          </span>
        </nav>
      </div>
    </div>
  );
}

/* ── Skärm: inspelning (telefon, mörk) ─────────────────────────── */
function RecordingScreen({ sv, onStop }: { sv: boolean; onStop: () => void }) {
  return (
    <div className="flex h-full flex-col bg-[var(--color-ink)] px-6 pb-8 pt-12 text-[var(--color-canvas)]">
      <div className="pt-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 px-2.5 py-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-coral)]" />
          <span className="text-[0.6875rem] uppercase tracking-[0.1em] text-white/80">
            {sv ? 'Inspelar lektion' : 'Recording lesson'}
          </span>
        </div>
        <h1 className="mt-4 font-serif text-[1.5rem] leading-tight">
          {sv ? 'Integralberäkning — del 2' : 'Integrals — part 2'}
        </h1>
        <p className="mt-1 text-[0.75rem] text-white/60">
          {sv ? 'Matematik 4 · NA3a · 10:15' : 'Math 4 · NA3a · 10:15'}
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="font-serif text-[5rem] leading-none tracking-tight tabular-nums">
          12:34
        </p>
        <p className="mt-1 text-[0.6875rem] uppercase tracking-[0.15em] text-white/50">
          min:sek
        </p>

        <button
          type="button"
          onClick={onStop}
          aria-label={sv ? 'Stoppa inspelning' : 'Stop recording'}
          className="relative mt-10 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-canvas)] transition-transform active:scale-95"
        >
          <span className="absolute inset-0 -m-2 rounded-full border-2 border-[var(--color-coral)]/60 coral-pulse" />
          <span className="h-6 w-6 rounded-[4px] bg-[var(--color-ink)]" />
        </button>
        <p className="mt-3 text-[0.75rem] text-white/70">
          {sv ? 'Tryck för att stoppa' : 'Tap to stop'}
        </p>
      </div>

      <div>
        <Waveform />
        <p className="mt-3 text-center text-[0.6875rem] text-white/50">
          {sv
            ? 'Mikrofon: iPhone (intern) · Kvalitet: HD'
            : 'Mic: iPhone (built-in) · Quality: HD'}
        </p>
      </div>
    </div>
  );
}

function Waveform() {
  const bars = [
    20, 38, 24, 52, 36, 18, 44, 60, 32, 22, 48, 30, 56, 24, 18, 42,
    50, 28, 38, 22, 46, 32, 58, 30, 20, 44, 36, 52, 28, 18, 40, 26,
  ];
  return (
    <div className="flex h-14 items-center justify-between gap-[3px]">
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-[var(--color-coral)]/80"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

/* ── Skärm: bearbetning (telefon) ──────────────────────────────── */
function ProcessingScreen({ sv }: { sv: boolean }) {
  const steps = sv
    ? ['Uppladdat', 'Transkriberat', 'Sökbart för eleverna']
    : ['Uploaded', 'Transcribed', 'Searchable for students'];
  return (
    <div className="flex h-full flex-col px-6 pb-8 pt-12">
      <div className="pt-4">
        <p className="font-serif text-[1.125rem] leading-none text-[var(--color-ink)]">
          Elevante
        </p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-sage)]/30">
          <span className="h-3 w-3 rounded-full bg-[var(--color-sage)]" />
        </div>
        <h1 className="mt-6 font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">
          {sv ? 'Lektionen sparas' : 'Saving the lesson'}
        </h1>
        <p className="mt-2 max-w-[15rem] text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {sv
            ? 'Ljudet laddas upp och transkriberas automatiskt.'
            : 'The audio uploads and is transcribed automatically.'}
        </p>
        <ul className="mt-6 space-y-2 text-left">
          {steps.map((t) => (
            <li
              key={t}
              className="flex items-center gap-2 text-[0.8125rem] text-[var(--color-ink)]"
            >
              <span className="status-dot status-dot--sage" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-center text-[0.6875rem] text-[var(--color-ink-muted)]">
        {sv ? 'Du gör ingenting mer.' : 'You do nothing more.'}
      </p>
    </div>
  );
}

/* ── Skärm: elevchatt (webbläsare) ─────────────────────────────── */
function ChatScreen({
  sv,
  answered,
  onSend,
}: {
  sv: boolean;
  answered: boolean;
  onSend: () => void;
}) {
  const question = sv
    ? 'Vad var skillnaden mellan bestämd och obestämd integral?'
    : 'What was the difference between a definite and an indefinite integral?';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-sand)] px-6 py-4">
        <div>
          <p className="font-serif text-[1rem] leading-none text-[var(--color-ink)]">
            Elevante
          </p>
          <p className="mt-1 text-[0.75rem] text-[var(--color-ink-muted)]">
            {sv ? 'Matematik 4 · NA3a' : 'Math 4 · NA3a'}
          </p>
        </div>
        <span className="text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
          {sv ? 'Elevvy' : 'Student view'}
        </span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {answered ? (
          <>
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-[16px] bg-[var(--color-ink)] px-4 py-2.5 text-[0.875rem] text-[var(--color-canvas)]">
                {question}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[0.9375rem] leading-relaxed text-[var(--color-ink)]">
                {sv
                  ? 'På lektionen förklarade läraren att en bestämd integral har gränser och ger ett tal — arean under kurvan mellan a och b. En obestämd integral saknar gränser och ger en funktion, den primitiva funktionen, plus en konstant C.'
                  : 'In the lesson the teacher explained that a definite integral has limits and gives a number — the area under the curve between a and b. An indefinite integral has no limits and gives a function, the antiderivative, plus a constant C.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="source-pill">
                  <span className="status-dot status-dot--sage" />
                  {sv
                    ? 'Integralberäkning — del 2 · 10:15'
                    : 'Integrals — part 2 · 10:15'}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="max-w-[20rem] text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'Eleven kom hem och undrar över en sak från dagens mattelektion.'
                : 'The student got home and is wondering about something from today’s maths lesson.'}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-sand)] px-6 py-4">
        {answered ? (
          <p className="text-center text-[0.75rem] text-[var(--color-ink-muted)]">
            {sv
              ? 'Svaret kommer ur lektionen — med källa. Aldrig en gissning.'
              : 'The answer comes from the lesson — with a source. Never a guess.'}
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 truncate rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-3 text-[0.875rem] text-[var(--color-ink)]">
              {question}
            </div>
            <button
              type="button"
              onClick={onSend}
              aria-label={sv ? 'Skicka frågan' : 'Send the question'}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-ink)] text-[1.125rem] text-[var(--color-canvas)]"
            >
              <span
                className="absolute inset-0 -m-1.5 rounded-[16px] border-2 border-[var(--color-coral)]/60 coral-pulse"
                aria-hidden="true"
              />
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
