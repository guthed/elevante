'use client';

import { useState } from 'react';

// Editorial Calm — Stitch screens 16/17/18 i interaktiv iPhone-mockup
// Demoflöde för säljare: klick navigerar mellan skärmarna utan riktig data.

type Screen = 'login' | 'schedule' | 'recording';

type Props = {
  locale: string;
};

export function MobileAppDemo({ locale }: Props) {
  const sv = locale === 'sv';
  const [screen, setScreen] = useState<Screen>('login');
  const [pendingUpload, setPendingUpload] = useState(false);

  const handleLogin = () => setScreen('schedule');
  const handleRecord = () => setScreen('recording');
  const handleStop = () => {
    setPendingUpload(true);
    setScreen('schedule');
  };
  const handleReset = () => {
    setScreen('login');
    setPendingUpload(false);
  };

  return (
    <div className="grid items-start gap-12 md:grid-cols-12 md:gap-16">
      {/* Phone frame */}
      <div className="md:col-span-6">
        <div className="mx-auto max-w-[380px]">
          {/* iPhone bezel */}
          <div className="relative rounded-[44px] bg-[var(--color-ink)] p-3 shadow-[0_32px_80px_-24px_rgba(26,26,46,0.4)]">
            {/* Notch */}
            <div className="absolute left-1/2 top-3 z-20 h-6 w-32 -translate-x-1/2 rounded-b-[20px] bg-[var(--color-ink)]" />
            {/* Screen */}
            <div className="relative h-[680px] overflow-hidden rounded-[32px] bg-[var(--color-canvas)]">
              {screen === 'login' ? (
                <LoginScreen sv={sv} onLogin={handleLogin} />
              ) : null}
              {screen === 'schedule' ? (
                <ScheduleScreen
                  sv={sv}
                  pendingUpload={pendingUpload}
                  onRecord={handleRecord}
                />
              ) : null}
              {screen === 'recording' ? (
                <RecordingScreen sv={sv} onStop={handleStop} />
              ) : null}
            </div>
          </div>

          {/* Step indicator */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <StepDot active={screen === 'login'} />
            <StepDot active={screen === 'schedule'} />
            <StepDot active={screen === 'recording'} />
          </div>
        </div>
      </div>

      {/* Narrative + controls */}
      <div className="md:col-span-6">
        <div className="sticky top-8">
          <p className="eyebrow mb-6">
            {sv ? 'Demo av lärar-appen' : 'Teacher app demo'}
          </p>

          {screen === 'login' ? (
            <Narrative
              title={sv ? 'Steg 1 — Logga in' : 'Step 1 — Log in'}
              body={
                sv
                  ? 'En gång. Sen vet appen vem du är, vilka lektioner du har och när. Inga e-postlänkar varje vecka. Inga möten med IT.'
                  : 'Once. Then the app knows who you are, your lessons and when. No weekly email links. No IT meetings.'
              }
              cta={sv ? 'Logga in →' : 'Log in →'}
              onCta={handleLogin}
            />
          ) : null}

          {screen === 'schedule' ? (
            <Narrative
              title={sv ? 'Steg 2 — Schemat finns redan' : 'Step 2 — Your schedule is already there'}
              body={
                sv
                  ? 'Lärarens schema synkas automatiskt. Nästa lektion är alltid en knapptryckning bort. Inga inställningar att kröka, ingen "vilken klass är detta?".'
                  : 'The teacher\'s schedule syncs automatically. The next lesson is always one tap away. Nothing to configure, no "which class is this?".'
              }
              cta={sv ? 'Spela in nästa lektion →' : 'Record next lesson →'}
              onCta={handleRecord}
            />
          ) : null}

          {screen === 'recording' ? (
            <Narrative
              title={sv ? 'Steg 3 — En knapp. Spelar in.' : 'Step 3 — One button. Recording.'}
              body={
                sv
                  ? 'Mörk skärm för att inte distrahera. Stor stop-knapp så du hittar den utan att kolla. Audion laddas upp automatiskt när lektionen är klar — du gör ingenting.'
                  : 'Dark screen to not distract. Big stop button so you find it without looking. Audio uploads automatically — you do nothing.'
              }
              cta={sv ? 'Stoppa inspelning →' : 'Stop recording →'}
              onCta={handleStop}
            />
          ) : null}

          {screen !== 'login' ? (
            <button
              type="button"
              onClick={handleReset}
              className="mt-8 text-[0.875rem] text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
            >
              {sv ? '↺ Spela demo från början' : '↺ Restart demo'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StepDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={[
        'h-1.5 rounded-full transition-all duration-300',
        active
          ? 'w-6 bg-[var(--color-ink)]'
          : 'w-1.5 bg-[var(--color-sand-strong)]',
      ].join(' ')}
    />
  );
}

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

/* ────────────────────────────────────────────────────────────────
   Stitch screen 16 — Login
   ──────────────────────────────────────────────────────────────── */
function LoginScreen({ sv, onLogin }: { sv: boolean; onLogin: () => void }) {
  return (
    <div className="flex h-full flex-col px-6 pb-6 pt-12">
      <div className="pt-4">
        <p className="font-serif text-[1.125rem] leading-none text-[var(--color-ink)]">
          Elevante
        </p>
        <p className="mt-1 text-[0.75rem] text-[var(--color-ink-muted)]">
          {sv ? 'för lärare' : 'for teachers'}
        </p>
      </div>

      <div className="mt-16">
        <h1 className="font-serif text-[2.5rem] leading-none tracking-[-0.01em] text-[var(--color-ink)]">
          {sv ? 'Hej.' : 'Hi.'}
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {sv
            ? 'Logga in för att börja spela in lektioner.'
            : 'Log in to start recording lessons.'}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onLogin();
        }}
        className="mt-8"
      >
        <label className="block">
          <span className="text-[0.75rem] uppercase tracking-[0.08em] text-[var(--color-ink-muted)]">
            {sv ? 'E-postadress' : 'Email'}
          </span>
          <input
            type="email"
            defaultValue="anna@stockholms-gymnasium.se"
            className="mt-2 w-full rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] focus:border-[var(--color-ink-secondary)] focus:outline-none"
          />
        </label>
        <label className="mt-5 block">
          <span className="text-[0.75rem] uppercase tracking-[0.08em] text-[var(--color-ink-muted)]">
            {sv ? 'Lösenord' : 'Password'}
          </span>
          <input
            type="password"
            defaultValue="••••••••"
            className="mt-2 w-full rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] focus:border-[var(--color-ink-secondary)] focus:outline-none"
          />
        </label>

        <button
          type="submit"
          className="mt-8 flex h-12 w-full items-center justify-center rounded-[12px] bg-[var(--color-ink)] text-[1rem] font-medium text-[var(--color-canvas)]"
        >
          {sv ? 'Logga in' : 'Log in'}
        </button>
      </form>

      <div className="mt-auto pb-2 text-center">
        <p className="text-[0.8125rem] text-[var(--color-ink-secondary)]">
          {sv ? 'Får jag inte tillgång? Be din skoladmin.' : 'No access? Ask your school admin.'}
        </p>
        <p className="mt-3 text-[0.6875rem] text-[var(--color-ink-muted)]">
          {sv ? 'Data lagras i Stockholm. GDPR-säkert.' : 'Data stored in Stockholm. GDPR-safe.'}
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Stitch screen 17 — Schedule
   ──────────────────────────────────────────────────────────────── */
function ScheduleScreen({
  sv,
  pendingUpload,
  onRecord,
}: {
  sv: boolean;
  pendingUpload: boolean;
  onRecord: () => void;
}) {
  const lessons = sv
    ? [
        { time: '08:15', end: '09:00', title: 'Algebraisk modellering', course: 'Matematik 4 · NA3a · A102', status: 'ready' },
        { time: '10:15', end: '11:00', title: 'Integralberäkning — del 2', course: 'Matematik 4 · NA3a · A102', status: pendingUpload ? 'ready' : 'waiting' },
        { time: '12:30', end: '13:15', title: 'Repetition inför prov', course: 'Matematik 3 · TE2c · A205', status: 'waiting' },
        { time: '14:00', end: '14:45', title: 'Derivata och optimering', course: 'Matematik 4 · NA3a · A102', status: 'waiting' },
      ]
    : [
        { time: '08:15', end: '09:00', title: 'Algebraic modelling', course: 'Math 4 · NA3a · A102', status: 'ready' },
        { time: '10:15', end: '11:00', title: 'Integrals — part 2', course: 'Math 4 · NA3a · A102', status: pendingUpload ? 'ready' : 'waiting' },
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

        {pendingUpload ? (
          <div className="mt-4 rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-3 py-2.5">
            <p className="text-[0.75rem] text-[var(--color-ink-secondary)]">
              {sv ? 'Föreläsning_slides.pptx · Laddar upp (67%)' : 'Lecture_slides.pptx · Uploading (67%)'}
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-sand)]">
              <div className="h-full w-2/3 rounded-full bg-[var(--color-coral)]" />
            </div>
          </div>
        ) : null}
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
          className="flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-ink)] text-[1rem] font-medium text-[var(--color-canvas)] shadow-[0_8px_24px_-8px_rgba(26,26,46,0.4)]"
        >
          {sv ? 'Spela in nästa lektion' : 'Record next lesson'} →
        </button>

        {/* Tab bar */}
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

/* ────────────────────────────────────────────────────────────────
   Stitch screen 18 — Recording (dark)
   ──────────────────────────────────────────────────────────────── */
function RecordingScreen({
  sv,
  onStop,
}: {
  sv: boolean;
  onStop: () => void;
}) {
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
  // 32 staplar med varierande höjd för att simulera live audio
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
