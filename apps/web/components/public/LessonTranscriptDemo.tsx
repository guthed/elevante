'use client';

import { useEffect, useRef, useState } from 'react';

// Hjälte-demo: lektionstranskriptet "tänds upp" på de rader svaret bygger på,
// samtidigt som eleven skriver sin fråga och Elevante skriver ut svaret.
// Loopar genom fem ämnen. sv/en har var sin uppsättning scenarier. Hela det
// korta transkriptet ryms i vyn — båda källraderna tänds samtidigt (i den smala
// hjälte-kolumnen blev "scrolla fram" opålitligt eftersom raderna radbryts).

type TranscriptLine = { t: string; x: string; hot?: boolean };
type Scenario = {
  sub: string;
  q: string;
  lines: TranscriptLine[];
  a: string;
  pills: string[];
};

const SCENARIOS: Record<'sv' | 'en', Scenario[]> = {
  sv: [
    {
      sub: 'Matematik 4 · L12',
      q: 'Vad var poängen med integralerna idag?',
      lines: [
        { t: '22:40', x: 'Då tar vi area under en kurva.' },
        { t: '23:14', x: 'En integral summerar oändligt många tunna remsor.', hot: true },
        { t: '23:48', x: 'Bredden går mot noll, höjden är funktionsvärdet.' },
        { t: '24:30', x: 'Så ytan blir exakt — inte en approximation.' },
        { t: '28:47', x: 'Samma idé använder ni sen för volymer.', hot: true },
      ],
      a: 'En integral lägger ihop oändligt många tunna remsor till en hel area. Idag använde ni det för att räkna ut ytan under kurvan exakt — inte bara en approximation. Samma tanke återkommer sen när ni ska räkna ut volymer.',
      pills: ['L12 · 23:14', 'L12 · 28:47'],
    },
    {
      sub: 'Biologi 1 · L8',
      q: 'Jag fattade aldrig vad osmos är. Kan du förklara?',
      lines: [
        { t: '16:30', x: 'Vi tittar på cellmembranet en stund.' },
        { t: '16:50', x: 'Tänk er ett russin i ett glas vatten.' },
        { t: '17:20', x: 'Vatten vandrar in dit det finns mest löst ämne.', hot: true },
        { t: '17:58', x: 'Membranet släpper vatten men inte sockret.' },
        { t: '21:05', x: 'Därför sväller russinet — det är osmos.', hot: true },
      ],
      a: 'Osmos är när vatten rör sig genom ett membran mot den sida där det finns mest löst ämne. Membranet släpper igenom vattnet men inte sockret, så vattnet vandrar in av sig självt. Det är därför russinet i exemplet sväller när det ligger i vatten.',
      pills: ['L8 · 17:20', 'L8 · 21:05'],
    },
    {
      sub: 'Historia 2 · L5',
      q: 'Vad ledde fram till första världskriget?',
      lines: [
        { t: '11:20', x: 'Vi börjar med läget i Europa före 1914.' },
        { t: '12:30', x: 'Stormakterna var bundna i två stora allianser.', hot: true },
        { t: '13:05', x: 'Tyskland och Österrike-Ungern på ena sidan.' },
        { t: '33:15', x: 'Så kom skotten i Sarajevo sommaren 1914.' },
        { t: '34:50', x: 'Det blev gnistan som utlöste hela kriget.', hot: true },
      ],
      a: 'Flera trådar löpte ihop. Stormakterna var bundna i två fientliga allianser, så ett enskilt bråk kunde dra in alla. När skotten i Sarajevo föll sommaren 1914 blev det gnistan som utlöste hela kriget.',
      pills: ['L5 · 12:30', 'L5 · 34:50'],
    },
    {
      sub: 'Kemi 1 · L3',
      q: 'Jag var sjuk igår — vad gick ni igenom på kemin?',
      lines: [
        { t: '09:50', x: 'Vi jämför två sätt att binda atomer.' },
        { t: '10:25', x: 'I en jonbindning ger en atom bort elektroner.', hot: true },
        { t: '11:40', x: 'Tänk på vanligt koksalt, natrium och klor.' },
        { t: '16:30', x: 'I en kovalent bindning delar atomerna på elektronerna.', hot: true },
        { t: '17:08', x: 'Som i en vattenmolekyl, väte och syre.' },
      ],
      a: 'Ni gick igenom skillnaden mellan jon- och kovalent bindning. I en jonbindning ger en atom bort elektroner till en annan, som i koksalt. I en kovalent bindning delar atomerna istället på dem, som väte och syre i en vattenmolekyl.',
      pills: ['L3 · 10:25', 'L3 · 16:30'],
    },
    {
      sub: 'Samhällskunskap 1 · L9',
      q: 'Hur hänger riksdag och regering ihop?',
      lines: [
        { t: '06:15', x: 'Vi reder ut vem som gör vad i svensk politik.' },
        { t: '07:00', x: 'Riksdagen är folkvald och stiftar alla lagar.', hot: true },
        { t: '07:45', x: 'Den bestämmer också över statens budget.' },
        { t: '08:20', x: 'Regeringen styr landet och verkställer lagarna.', hot: true },
        { t: '09:05', x: 'Regeringen måste ha riksdagens stöd.' },
      ],
      a: 'Riksdagen är folkvald och stiftar lagarna och bestämmer över budgeten. Regeringen styr landet och verkställer de lagar riksdagen beslutat. Eftersom regeringen måste ha riksdagens stöd kan riksdagen också rösta bort en regering den inte längre litar på.',
      pills: ['L9 · 07:00', 'L9 · 08:20'],
    },
  ],
  en: [
    {
      sub: 'Mathematics 4 · L12',
      q: 'What was the point of the integrals today?',
      lines: [
        { t: '22:40', x: "Let's take the area under a curve." },
        { t: '23:14', x: 'An integral sums up infinitely many thin strips.', hot: true },
        { t: '23:48', x: 'The width goes to zero, the height is the value.' },
        { t: '24:30', x: 'So the area is exact — not an approximation.' },
        { t: '28:47', x: "You'll use the same idea later for volumes.", hot: true },
      ],
      a: 'An integral adds up infinitely many thin strips into one whole area. Today you used it to work out the area under the curve exactly — not just an approximation. The same idea comes back later when you calculate volumes.',
      pills: ['L12 · 23:14', 'L12 · 28:47'],
    },
    {
      sub: 'Biology 1 · L8',
      q: 'I never got what osmosis is. Can you explain?',
      lines: [
        { t: '16:30', x: "Let's look at the cell membrane for a moment." },
        { t: '16:50', x: 'Picture a raisin in a glass of water.' },
        { t: '17:20', x: 'Water moves toward the side with more dissolved substance.', hot: true },
        { t: '17:58', x: 'The membrane lets water through but not the sugar.' },
        { t: '21:05', x: "That's why the raisin swells — that's osmosis.", hot: true },
      ],
      a: 'Osmosis is when water moves through a membrane toward the side with the most dissolved substance. The membrane lets the water through but not the sugar, so the water moves in on its own. That is why the raisin in the example swells when it sits in water.',
      pills: ['L8 · 17:20', 'L8 · 21:05'],
    },
    {
      sub: 'History 2 · L5',
      q: 'What led up to the First World War?',
      lines: [
        { t: '11:20', x: "Let's start with Europe before 1914." },
        { t: '12:30', x: 'The great powers were locked into two alliances.', hot: true },
        { t: '13:05', x: 'Germany and Austria-Hungary on one side.' },
        { t: '33:15', x: 'Then came the shots in Sarajevo in summer 1914.' },
        { t: '34:50', x: 'That was the spark that set off the whole war.', hot: true },
      ],
      a: 'Several threads came together. The great powers were locked into two hostile alliances, so a single conflict could pull everyone in. When the shots were fired in Sarajevo in the summer of 1914, that became the spark that set off the whole war.',
      pills: ['L5 · 12:30', 'L5 · 34:50'],
    },
    {
      sub: 'Chemistry 1 · L3',
      q: 'I was sick yesterday — what did you cover in chemistry?',
      lines: [
        { t: '09:50', x: "Let's compare two ways of bonding atoms." },
        { t: '10:25', x: 'In an ionic bond, one atom gives electrons away.', hot: true },
        { t: '11:40', x: 'Think of table salt, sodium and chlorine.' },
        { t: '16:30', x: 'In a covalent bond, the atoms share the electrons.', hot: true },
        { t: '17:08', x: 'Like in a water molecule, hydrogen and oxygen.' },
      ],
      a: 'You went through the difference between ionic and covalent bonds. In an ionic bond, one atom gives its electrons to another, like in table salt. In a covalent bond, the atoms share them instead, like hydrogen and oxygen in a water molecule.',
      pills: ['L3 · 10:25', 'L3 · 16:30'],
    },
    {
      sub: 'Social Studies 1 · L9',
      q: 'How do parliament and government fit together?',
      lines: [
        { t: '06:15', x: "Let's sort out who does what in Swedish politics." },
        { t: '07:00', x: 'The Riksdag is elected and makes the laws.', hot: true },
        { t: '07:45', x: 'It also decides on the state budget.' },
        { t: '08:20', x: 'The government runs the country and enforces them.', hot: true },
        { t: '09:05', x: "The government needs the Riksdag's support." },
      ],
      a: "The Riksdag is elected by the people, makes the laws and decides the budget. The government runs the country and carries out the laws the Riksdag has passed. Because the government needs the Riksdag's support, the Riksdag can also vote out a government it no longer trusts.",
      pills: ['L9 · 07:00', 'L9 · 08:20'],
    },
  ],
};

export function LessonTranscriptDemo({ locale }: { locale: string }) {
  const lang: 'sv' | 'en' = locale === 'en' ? 'en' : 'sv';
  const scenarios = SCENARIOS[lang];
  const [index, setIndex] = useState(0);
  const scenario = scenarios[index];

  const listRef = useRef<HTMLDivElement>(null);
  const qRowRef = useRef<HTMLDivElement>(null);
  const qRef = useRef<HTMLDivElement>(null);
  const thinkRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLParagraphElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const qRow = qRowRef.current;
    const q = qRef.current;
    const think = thinkRef.current;
    const a = aRef.current;
    const pills = pillsRef.current;
    if (!list || !qRow || !q || !think || !a || !pills) return;

    const current = SCENARIOS[lang][index];
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms));
    };

    // Återställ inför varje scenario
    q.textContent = '';
    q.classList.remove('type-caret');
    a.textContent = '';
    a.classList.remove('type-caret');
    pills.innerHTML = '';
    think.style.display = 'none';
    qRow.style.opacity = '0';
    qRow.style.transform = 'translateY(8px)';
    const lineEls = list.querySelectorAll('.transcript-line');
    lineEls.forEach((el) => el.classList.remove('transcript-line--hot'));

    const lightUpSources = () => {
      list
        .querySelectorAll('[data-hot="1"]')
        .forEach((el) => el.classList.add('transcript-line--hot'));
    };

    const type = (el: HTMLElement, text: string, speed: number, done: () => void) => {
      el.classList.add('type-caret');
      let i = 0;
      const step = () => {
        if (i >= text.length) {
          el.classList.remove('type-caret');
          done();
          return;
        }
        el.textContent += text.charAt(i);
        i += 1;
        const jitter = speed + (text.charAt(i - 1) === ' ' ? 40 : 0);
        timers.push(window.setTimeout(step, jitter));
      };
      step();
    };

    const showPills = () => {
      current.pills.forEach((p, i) => {
        const sp = document.createElement('span');
        sp.className = 'source-pill demo-pill';
        sp.innerHTML = `<span class="status-dot status-dot--sage" aria-hidden="true"></span>${p}`;
        pills.appendChild(sp);
        timers.push(window.setTimeout(() => sp.classList.add('demo-pill--show'), 150 * i));
      });
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      qRow.style.opacity = '1';
      qRow.style.transform = 'none';
      q.textContent = current.q;
      lightUpSources();
      a.textContent = current.a;
      showPills();
      return () => timers.forEach((t) => window.clearTimeout(t));
    }

    at(500, () => {
      qRow.style.opacity = '1';
      qRow.style.transform = 'none';
    });
    at(750, () =>
      type(q, current.q, 42, () => {
        at(450, () => {
          think.style.display = 'flex';
          at(950, () => {
            lightUpSources();
            at(1050, () => {
              think.style.display = 'none';
              type(a, current.a, 22, () => {
                showPills();
                at(4000, () => setIndex((i) => (i + 1) % scenarios.length));
              });
            });
          });
        });
      }),
    );

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [index, lang, scenarios.length]);

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="sr-only">
        {lang === 'en'
          ? 'Example: a student asks Elevante about a lesson and gets an answer with a time-stamped source from the lesson transcript.'
          : 'Exempel: en elev frågar Elevante om en lektion och får ett svar med tidsstämplad källa ur lektionstranskriptet.'}
      </p>

      <div aria-hidden="true" className="flex flex-col gap-5">
        {/* Transkript — i mobilvyn under chatten, på desktop överst */}
        <div className="order-2 overflow-hidden rounded-[20px] border border-[var(--color-sand)] bg-[var(--color-surface)] shadow-[0_2px_8px_-2px_rgba(26,26,46,0.06)] md:order-1">
          <div className="flex items-center justify-between border-b border-[var(--color-sand)] px-5 py-4">
            <span className="inline-flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
              <span className="status-dot status-dot--sage" />
              {lang === 'en' ? 'Transcript' : 'Transkript'}
            </span>
            <span className="text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--color-ink-muted)]">
              {scenario.sub}
            </span>
          </div>
          <div ref={listRef} className="px-5 py-3">
            {scenario.lines.map((l, i) => (
              <div key={i} data-hot={l.hot ? '1' : '0'} className="transcript-line">
                <span className="transcript-ts">{l.t}</span>
                {l.x}
              </div>
            ))}
          </div>
        </div>

        {/* Chat — i mobilvyn överst, på desktop under transkriptet */}
        <div className="order-1 rounded-[20px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5 shadow-[0_24px_60px_-20px_rgba(26,26,46,0.16)] md:order-2">
          <span className="font-serif text-[0.9375rem] text-[var(--color-ink)]">Elevante</span>
          <div
            ref={qRowRef}
            className="mt-3 flex justify-end"
            style={{
              opacity: 0,
              transform: 'translateY(8px)',
              transition:
                'opacity 450ms cubic-bezier(0.22, 1, 0.36, 1), transform 450ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <div
              ref={qRef}
              className="max-w-[85%] rounded-[16px] bg-[var(--color-ink)] px-4 py-2.5 text-[0.875rem] leading-snug text-[var(--color-canvas)]"
            />
          </div>
          <div className="mt-4 min-h-[9rem]">
            <div ref={thinkRef} className="items-center gap-1.5" style={{ display: 'none' }}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
            <p ref={aRef} className="text-[0.875rem] leading-relaxed text-[var(--color-ink)]" />
            <div ref={pillsRef} className="mt-3 flex flex-wrap gap-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
