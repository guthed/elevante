'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { gradeFlashcard } from '@/app/actions/training';
import { Button } from '@/components/ui/Button';
import { FeedbackButton } from '@/components/app/feedback/FeedbackButton';
import { useFeedbackItem } from '@/components/app/feedback/useFeedbackItem';
import type { Locale } from '@/lib/i18n/config';
import type { FlashcardSessionItem } from '@/lib/data/training';

type Grade = 'again' | 'hard' | 'good';

type Props = {
  locale: Locale;
  cards: FlashcardSessionItem[];
};

// Ordningen är svagast → starkast, och knapparna skiljs åt med TYNGD
// (outline → sand → ink), inte med kulör: det här är en självskattning, inte
// rätt/fel. Se den längre motiveringen vid betygsraden nedan.
const GRADES: Array<{
  grade: Grade;
  variant: 'outline' | 'secondary';
  extraClass?: string;
}> = [
  { grade: 'again', variant: 'outline' },
  {
    grade: 'hard',
    variant: 'outline',
    extraClass:
      'border-transparent bg-[var(--color-sand)] text-[var(--color-ink)] hover:bg-[var(--color-sand-strong)]',
  },
  { grade: 'good', variant: 'secondary' },
];

function gradeLabel(grade: Grade, sv: boolean, form: 'short' | 'long'): string {
  const labels: Record<Grade, Record<'short' | 'long', { sv: string; en: string }>> = {
    again: {
      short: { sv: 'Visste inte', en: "Didn't know" },
      long: { sv: 'Det här visste jag inte', en: "I didn't know this" },
    },
    hard: {
      short: { sv: 'Osäker', en: 'Unsure' },
      long: { sv: 'Det här var jag osäker på', en: "I wasn't sure" },
    },
    good: {
      short: { sv: 'Visste', en: 'Knew it' },
      long: { sv: 'Det här visste jag', en: 'I knew this' },
    },
  };
  const l = labels[grade][form];
  return sv ? l.sv : l.en;
}

export function FlashcardRunner({ locale, cards }: Props) {
  const sv = locale === 'sv';
  const [, startTransition] = useTransition();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const done = index >= cards.length;

  // Registrerar vilket kort eleven tittar på, så att en rapport från VAR SOM
  // HELST i appen (topbaren, sidomenyn) automatiskt bär med lektion, kort-id
  // och begrepp. Måste ligga före den tidiga returen nedan — hooks får inte
  // hoppas över mellan renders.
  const currentCard: FlashcardSessionItem | undefined = cards[index];
  useFeedbackItem(
    currentCard
      ? {
          lessonId: currentCard.lessonId,
          lessonTitle: currentCard.lessonTitle,
          itemType: 'flashcard',
          itemId: currentCard.id,
          itemLabel: currentCard.front,
          conceptName: currentCard.conceptName,
        }
      : null,
  );

  const cardButtonRef = useRef<HTMLButtonElement>(null);
  const summaryHeadingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  // Varje betyg avmonterar den knapp som just hade fokus (nästa korts
  // flip-knapp tar dess plats, eller sammanfattningen om sessionen är
  // klar) — utan explicit refokusering hamnar webbläsarens fokus på
  // <body>, och en tangentbords-/skärmläsaranvändare måste tabba från
  // sidans topp igen för varje kort. Hoppar över den allra första
  // renderingen så vi inte stjäl fokus från någon som bara läser sidan.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (done) {
      summaryHeadingRef.current?.focus();
    } else {
      cardButtonRef.current?.focus();
    }
  }, [index, done]);

  if (done) {
    const shaky = grades.filter((g) => g !== 'good').length;
    return (
      <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-8 text-center">
        <h2
          ref={summaryHeadingRef}
          tabIndex={-1}
          className="rounded-[8px] font-serif text-[1.375rem] text-[var(--color-ink)]"
        >
          {sv ? 'Klart för den här gången' : 'Done for now'}
        </h2>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {sv
            ? `Du gick igenom ${cards.length} kort. ${shaky} kommer tillbaka snart.`
            : `You went through ${cards.length} cards. ${shaky} will come back soon.`}
        </p>
        <div className="mt-6">
          <Link href={`/${locale}/app/student/ova`}>
            <Button type="button">{sv ? 'Träna mer' : 'Practise more'}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const card = cards[index];
  const hasMisconception = Boolean(card.conceptMisconception);

  function handleGrade(grade: Grade) {
    startTransition(() => {
      gradeFlashcard(card.lessonId, card.id, grade);
    });
    setGrades((prev) => [...prev, grade]);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  const misconceptionLabel = sv ? 'Vanligt missförstånd' : 'Common mix-up';

  return (
    <div className="space-y-4">
      {/* Staplas under 640px så att räknaren och den (ofta långa) lektionstiteln
          aldrig delar en rad — de bröts annars mitt i "Kort 1 av / 20". */}
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <p className="text-[0.8125rem] text-[var(--color-ink-muted)]">
          {sv ? 'Kort' : 'Card'} {index + 1} {sv ? 'av' : 'of'} {cards.length}
        </p>
        <div className="flex items-baseline gap-2 sm:justify-end">
          <p className="truncate text-[0.8125rem] text-[var(--color-ink-muted)]">
            {card.lessonTitle ?? ''}
          </p>
          {/* Tydligare här än i topbaren: det är på korten problemen troligast
              uppstår, och kortet eleven är på bifogas automatiskt. */}
          <FeedbackButton
            locale={locale}
            variant="inline"
            className="-my-1 shrink-0"
            label={sv ? 'Fel på kortet?' : 'Wrong with this card?'}
          />
        </div>
      </div>

      {card.conceptName ? (
        <p className="text-center text-[0.75rem] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
          {card.conceptName}
        </p>
      ) : null}

      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8">
        <div>
          <button
            ref={cardButtonRef}
            type="button"
            onClick={() => setFlipped((f) => !f)}
            aria-expanded={flipped}
            className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-8 text-center transition-colors hover:bg-[var(--color-surface-soft)] lg:min-h-[320px] lg:p-12"
          >
            <p className="font-serif text-[1.25rem] leading-snug text-[var(--color-ink)] lg:text-[1.75rem]">
              {card.front}
            </p>
            {flipped ? (
              <div className="mt-6 w-full border-t border-[var(--color-sand)] pt-6">
                <p className="text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)] lg:text-[1.0625rem]">
                  {card.back}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-[0.8125rem] text-[var(--color-ink-muted)]">
                {sv ? 'Tryck för att se svaret' : 'Tap to see the answer'}
              </p>
            )}
          </button>
        </div>

        {hasMisconception ? (
          <div className="hidden lg:block">
            {flipped ? (
              <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface-soft)] p-6">
                <p className="text-[0.8125rem] font-medium uppercase tracking-wide text-coral-deep">
                  {misconceptionLabel}
                </p>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {card.conceptMisconception}
                </p>
              </div>
            ) : (
              <div className="rounded-[16px] border border-dashed border-[var(--color-sand)] p-6">
                <p className="text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
                  {sv
                    ? 'Vänd kortet för att se ett vanligt missförstånd om det här konceptet.'
                    : 'Flip the card to see a common mix-up about this concept.'}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Staplas fullbredd under 640px för större tumytor och för att fylla
          det tomma utrymmet under kortet; en rad från sm och uppåt. Ligger
          utanför lg:grid-rutnätet ovan så att raden får hela innehållsbredden
          att fördela mellan de tre (nu längre) knapptexterna istället för att
          klämmas in i vänsterkolumnens 1fr — annars radbryts etiketterna.

          Färgsättning: knapparna skiljs åt med TYNGD (outline → sand → ink),
          inte med kulör. Medvetet varken rött eller grönt — det här är en
          självskattning, inte rätt/fel. Färgar vi "visste inte" som ett fel
          slutar elever svara ärligt för att slippa känslan, och då faller hela
          SM-2-schemaläggningen, som bygger på att svaret är sant. Accenten
          (--color-accent) används inte: den ska enligt designmanualen användas
          sparsamt, och det här är funktionens mest tryckta kontroll. */}
      {flipped ? (
        <div className="flex flex-row flex-wrap justify-center gap-2 sm:gap-3">
          {GRADES.map(({ grade, variant, extraClass }) => (
            <Button
              key={grade}
              type="button"
              variant={variant}
              aria-label={gradeLabel(grade, sv, 'long')}
              className={[
                'flex-1 px-3 text-[0.875rem] sm:flex-none sm:px-5 sm:text-[0.95rem]',
                extraClass ?? '',
              ].join(' ')}
              onClick={() => handleGrade(grade)}
            >
              {/* Kort etikett på mobil, hel mening från sm. Alla tre måste
                  synas SAMTIDIGT — staplade fullbreddsknappar under ett vänt
                  kort (som växer med svarstexten) tryckte alternativ två och
                  tre under vikningen på telefon, och då blir självskattningen
                  inte längre ett val mellan tre grader utan ett enda synligt
                  alternativ. Den hela meningen bor kvar i aria-label, så det
                  tillgängliga namnet är detsamma oavsett skärmbredd. */}
              <span className="sm:hidden">{gradeLabel(grade, sv, 'short')}</span>
              <span className="hidden sm:inline">{gradeLabel(grade, sv, 'long')}</span>
            </Button>
          ))}
        </div>
      ) : null}

      {/* Under 1024px: fyller det tomma utrymmet mellan betygsknapparna och
          bottennavigationen istället för att slösas bort. Döljs på lg där
          samma innehåll istället ligger i sidopanelen till höger. */}
      {flipped && hasMisconception ? (
        <div className="rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface-soft)] p-4 lg:hidden">
          <p className="text-[0.75rem] font-medium uppercase tracking-wide text-coral-deep">
            {misconceptionLabel}
          </p>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {card.conceptMisconception}
          </p>
        </div>
      ) : null}
    </div>
  );
}
