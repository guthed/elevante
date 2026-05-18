'use client';

import { useState } from 'react';

// Interaktiv iPhone-mockup som speglar den faktiska lärar-appen
// (apps/mobile): login → dagens lektion → inspelning (idle → recording).
// Skärmarna använder mobilappens designtokens (apps/mobile/lib/theme.ts).

type Screen = 'login' | 'schedule' | 'record';
type RecordPhase = 'idle' | 'recording';

type Props = {
  locale: string;
};

export function MobileAppDemo({ locale }: Props) {
  const sv = locale === 'sv';
  const [screen, setScreen] = useState<Screen>('login');
  const [recordPhase, setRecordPhase] = useState<RecordPhase>('idle');
  const [pendingUpload, setPendingUpload] = useState(false);

  const lesson = sv
    ? { time: '10:15 – 11:00', room: 'Sal B214', course: 'Ekologi', detail: 'Biologi 2 · NA2b' }
    : { time: '10:15 – 11:00', room: 'Room B214', course: 'Ecology', detail: 'Biology 2 · NA2b' };

  const handleLogin = () => setScreen('schedule');
  const handleOpenLesson = () => {
    setRecordPhase('idle');
    setScreen('record');
  };
  const handleStartRecording = () => setRecordPhase('recording');
  const handleStop = () => {
    setPendingUpload(true);
    setRecordPhase('idle');
    setScreen('schedule');
  };
  const handleReset = () => {
    setScreen('login');
    setRecordPhase('idle');
    setPendingUpload(false);
  };

  const narrative = (() => {
    if (screen === 'login') {
      return {
        title: sv ? 'Steg 1 — Logga in' : 'Step 1 — Log in',
        body: sv
          ? 'Läraren loggar in en gång. Sedan vet appen vem hen är och vilka lektioner som ligger på schemat idag.'
          : 'The teacher logs in once. After that the app knows who they are and which lessons are on today’s schedule.',
        cta: sv ? 'Logga in →' : 'Log in →',
        onCta: handleLogin,
      };
    }
    if (screen === 'schedule') {
      if (pendingUpload) {
        return {
          title: sv ? 'Klart — inget efterarbete' : 'Done — no follow-up work',
          body: sv
            ? 'Inspelningen laddas upp i bakgrunden. Läraren gör ingenting mer. Snart kan eleverna ställa frågor om ekologilektionen.'
            : 'The recording uploads in the background. The teacher does nothing more. Soon students can ask questions about the ecology lesson.',
          cta: undefined,
          onCta: undefined,
        };
      }
      return {
        title: sv ? 'Steg 2 — Dagens lektion' : 'Step 2 — Today’s lesson',
        body: sv
          ? 'Schemat synkas automatiskt — dagens lektion ligger redan här. Läraren behöver inte namnge eller tagga något. Tryck på lektionen för att öppna den.'
          : 'The schedule syncs automatically — today’s lesson is already here. The teacher names and tags nothing. Tap the lesson to open it.',
        cta: sv ? 'Öppna lektionen →' : 'Open the lesson →',
        onCta: handleOpenLesson,
      };
    }
    if (recordPhase === 'idle') {
      return {
        title: sv ? 'Steg 3 — Tryck för att spela in' : 'Step 3 — Tap to record',
        body: sv
          ? 'Inspelningsskärmen är mörk för att inte distrahera. En enda stor knapp — tryck på den röda knappen för att starta inspelningen.'
          : 'The recording screen is dark so it does not distract. One big button — tap the red button to start recording.',
        cta: sv ? 'Starta inspelning →' : 'Start recording →',
        onCta: handleStartRecording,
      };
    }
    return {
      title: sv ? 'Spelar in lektionen' : 'Recording the lesson',
      body: sv
        ? 'Timern räknar. När lektionen är slut trycker läraren på stopp — ljudet laddas upp automatiskt och köar för transkribering.'
        : 'The timer runs. When the lesson ends the teacher taps stop — the audio uploads automatically and queues for transcription.',
      cta: sv ? 'Stoppa inspelning →' : 'Stop recording →',
      onCta: handleStop,
    };
  })();

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
            <div className="relative h-[680px] overflow-hidden rounded-[32px]">
              {screen === 'login' ? (
                <LoginScreen sv={sv} onLogin={handleLogin} />
              ) : null}
              {screen === 'schedule' ? (
                <ScheduleScreen
                  sv={sv}
                  lesson={lesson}
                  pendingUpload={pendingUpload}
                  onOpenLesson={handleOpenLesson}
                />
              ) : null}
              {screen === 'record' ? (
                <RecordScreen
                  sv={sv}
                  lesson={lesson}
                  phase={recordPhase}
                  onStart={handleStartRecording}
                  onStop={handleStop}
                />
              ) : null}
            </div>
          </div>

          {/* Step indicator */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <StepDot active={screen === 'login'} />
            <StepDot active={screen === 'schedule'} />
            <StepDot active={screen === 'record'} />
          </div>
        </div>
      </div>

      {/* Narrative + controls */}
      <div className="md:col-span-6">
        <div className="sticky top-8">
          <p className="eyebrow mb-6">
            {sv ? 'Demo av lärar-appen' : 'Teacher app demo'}
          </p>

          <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
            {narrative.title}
          </h2>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {narrative.body}
          </p>

          {narrative.cta && narrative.onCta ? (
            <button
              type="button"
              onClick={narrative.onCta}
              className="mt-8 inline-flex items-center gap-2 rounded-[12px] bg-[var(--color-ink)] px-5 py-3 text-[0.9375rem] font-medium text-[var(--color-canvas)] transition-opacity hover:opacity-90"
            >
              {narrative.cta}
            </button>
          ) : null}

          {screen !== 'login' ? (
            <button
              type="button"
              onClick={handleReset}
              className="mt-8 block text-[0.875rem] text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
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

type Lesson = { time: string; room: string; course: string; detail: string };

/* ────────────────────────────────────────────────────────────────
   Login — speglar apps/mobile/app/(auth)/login.tsx
   ──────────────────────────────────────────────────────────────── */
function LoginScreen({ sv, onLogin }: { sv: boolean; onLogin: () => void }) {
  return (
    <div className="flex h-full flex-col bg-[#f8f8f8] px-6 pt-16">
      <p className="text-center text-[1.25rem] font-semibold text-[#1a1a2e]">
        Elevante
      </p>
      <p className="mt-12 text-[2rem] font-bold leading-tight text-[#1a1a2e]">
        {sv ? 'Logga in' : 'Log in'}
      </p>
      <p className="mt-2 text-[0.9375rem] text-[#5b5e72]">
        {sv
          ? 'För lärare som spelar in lektioner.'
          : 'For teachers who record lessons.'}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onLogin();
        }}
        className="mt-2"
      >
        <div className="mt-6">
          <label className="block text-[0.8125rem] font-medium text-[#1a1a2e]">
            {sv ? 'E-post' : 'Email'}
          </label>
          <input
            type="email"
            defaultValue="anna@nacka-gymnasium.se"
            className="mt-1.5 w-full rounded-[12px] border border-[#e4e6ec] bg-white px-4 py-3 text-[0.9375rem] text-[#1a1a2e] focus:border-[#4f7fff] focus:outline-none"
          />
        </div>
        <div className="mt-5">
          <label className="block text-[0.8125rem] font-medium text-[#1a1a2e]">
            {sv ? 'Lösenord' : 'Password'}
          </label>
          <input
            type="password"
            defaultValue="passwordtext"
            className="mt-1.5 w-full rounded-[12px] border border-[#e4e6ec] bg-white px-4 py-3 text-[0.9375rem] text-[#1a1a2e] focus:border-[#4f7fff] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-[#4f7fff] text-[0.9375rem] font-semibold text-white transition-colors hover:bg-[#3d6be6]"
        >
          {sv ? 'Logga in' : 'Log in'}
        </button>
      </form>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Schedule — speglar apps/mobile/app/(app)/index.tsx
   ──────────────────────────────────────────────────────────────── */
function ScheduleScreen({
  sv,
  lesson,
  pendingUpload,
  onOpenLesson,
}: {
  sv: boolean;
  lesson: Lesson;
  pendingUpload: boolean;
  onOpenLesson: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-[#f8f8f8]">
      <div className="px-6 pt-12">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[#8a8d9e]">
              {sv ? 'Idag' : 'Today'}
            </p>
            <p className="mt-1 text-[1.5rem] font-bold text-[#1a1a2e]">
              Anna Bergström
            </p>
          </div>
          <span className="text-[0.8125rem] text-[#5b5e72]">
            {sv ? 'Logga ut' : 'Log out'}
          </span>
        </div>
      </div>

      {pendingUpload ? (
        <div className="mx-6 mt-4 rounded-[12px] bg-[#fef3c7] px-4 py-2.5">
          <p className="text-[0.8125rem] text-[#92400e]">
            {sv
              ? '1 inspelning väntar på upload'
              : '1 recording waiting to upload'}
          </p>
        </div>
      ) : null}

      <div className="mt-4 px-6">
        <button
          type="button"
          onClick={onOpenLesson}
          className="w-full rounded-[20px] border border-[#e4e6ec] bg-white p-5 text-left transition-colors hover:border-[#4f7fff]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[0.875rem] font-semibold text-[#4f7fff]">
              {lesson.time}
            </span>
            <span className="text-[0.75rem] text-[#8a8d9e]">{lesson.room}</span>
          </div>
          <p className="mt-2 text-[1.375rem] font-bold leading-tight text-[#1a1a2e]">
            {lesson.course}
          </p>
          <p className="mt-1 text-[0.8125rem] text-[#5b5e72]">{lesson.detail}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
            <span className="text-[0.8125rem] text-[#5b5e72]">
              {sv ? 'Tryck för att spela in' : 'Tap to record'}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Record — speglar apps/mobile/app/(app)/record.tsx (idle → recording)
   ──────────────────────────────────────────────────────────────── */
function RecordScreen({
  sv,
  lesson,
  phase,
  onStart,
  onStop,
}: {
  sv: boolean;
  lesson: Lesson;
  phase: RecordPhase;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-[#1a1a2e] px-6 pb-10 pt-12 text-white">
      <div className="flex justify-end">
        <span
          className={
            phase === 'recording'
              ? 'text-[0.9375rem] text-white/35'
              : 'text-[0.9375rem] text-white'
          }
        >
          {sv ? 'Avbryt' : 'Cancel'}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        {phase === 'recording' ? (
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ef4444]" />
            <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-white/80">
              {sv ? 'Spelar in lektionen' : 'Recording the lesson'}
            </span>
          </div>
        ) : null}

        <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-white/60">
          {lesson.detail}
        </p>
        <p className="mt-1.5 text-[1.875rem] font-bold leading-tight text-white">
          {lesson.course}
        </p>

        <p className="mt-10 text-[4rem] font-light leading-none tabular-nums text-white">
          {phase === 'recording' ? '12:34' : '00:00'}
        </p>

        {phase === 'idle' ? (
          <button
            type="button"
            onClick={onStart}
            aria-label={sv ? 'Starta inspelning' : 'Start recording'}
            className="mt-10 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white transition-transform active:scale-95"
          >
            <span className="h-[3.75rem] w-[3.75rem] rounded-full bg-[#ef4444]" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onStop}
            aria-label={sv ? 'Stoppa inspelning' : 'Stop recording'}
            className="relative mt-10 flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#ef4444] transition-transform active:scale-95"
          >
            <span className="absolute inset-0 -m-2 rounded-full border-2 border-[#ef4444]/60 coral-pulse" />
            <span className="h-7 w-7 rounded-[4px] bg-[#ef4444]" />
          </button>
        )}

        <p className="mt-5 text-[0.8125rem] text-white/70">
          {phase === 'idle'
            ? sv
              ? 'Tryck för att börja'
              : 'Tap to start'
            : sv
              ? 'Tryck för att stoppa och ladda upp'
              : 'Tap to stop and upload'}
        </p>
      </div>
    </div>
  );
}
