import Eyebrow from '@/components/showcase/Eyebrow';
import Reveal from '@/components/showcase/Reveal';
import ZoomableShot from '@/components/showcase/ZoomableShot';
import { LoopStep, RecVisual, TranscribeVisual, AskVisual } from '@/components/showcase/LoopVisuals';
import StackedCurve from '@/components/showcase/StackedCurve';
import DeckStats from '@/components/showcase/DeckStats';
import NetworkReveal from '@/components/showcase/NetworkReveal';
import ConcentricMarket from '@/components/showcase/ConcentricMarket';
import Timeline from '@/components/showcase/Timeline';
import ScrollProgress from '@/components/showcase/ScrollProgress';
import CountUp from '@/components/showcase/CountUp';
import LangToggle from './LangToggle';
import {
  t,
  type Lang,
  COPY,
  PROBLEM_STATS,
  PROBLEM_SOURCE,
  ARR,
  MARKET_RINGS,
  EXPANSION,
  ASK,
  TRACTION,
} from './content';

import shotChat from '../../public/rektor/chat-kallor.png';
import shotElev from '../../public/rektor/elev-oversikt.png';
import shotKarta from '../../public/rektor/forstaelse-karta.png';

export default function InvestorDeck({ lang }: { lang: Lang }) {
  const sv = lang === 'sv';

  return (
    <main className="bg-canvas text-ink">
      <ScrollProgress />
      <LangToggle lang={lang} />

      {/* ── §1 HERO ─────────────────────────────────────────────────── */}
      <section className="flex min-h-[88vh] items-center px-6 py-24 sm:px-10">
        <div className="container-content w-full">
          <Eyebrow>{t(lang, COPY.hero.eyebrow)}</Eyebrow>
          <h1 className="mt-6 font-serif text-6xl leading-[0.95] tracking-tight sm:text-7xl md:text-8xl">
            {t(lang, COPY.hero.title)}
            <span className="text-coral">.</span>
          </h1>
          <p className="mt-6 font-serif text-2xl italic text-ink-secondary sm:text-3xl">
            {t(lang, COPY.hero.tagline)}
          </p>
          <p className="mt-10 max-w-2xl border-t border-ink/10 pt-8 text-lg leading-relaxed text-ink-secondary">
            {t(lang, COPY.hero.lede)}
          </p>
          <p className="mt-8 text-sm text-ink-muted">
            {t(lang, COPY.hero.preseedLine)}
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            {t(lang, COPY.hero.traction)}
          </p>
          <p className="mt-12 text-sm text-ink-muted">{sv ? 'Scrolla ↓' : 'Scroll ↓'}</p>
        </div>
      </section>

      {/* ── §2 PROBLEM ──────────────────────────────────────────────── */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.problem.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.problem.title)}
            </h2>
          </Reveal>
          <DeckStats
            items={PROBLEM_STATS.map((s) => ({
              big: s.big,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              countTo: (s as any).countTo as number | undefined,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              countSuffix: (s as any).countSuffix as string | undefined,
              label: t(lang, s.label),
            }))}
          />
          <Reveal>
            <p className="mt-8 text-sm text-ink-muted">{t(lang, PROBLEM_SOURCE)}</p>
          </Reveal>
        </div>
      </section>

      {/* ── §3 GAP ──────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.gap.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.gap.title)}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* Students card */}
            <Reveal delay={0}>
              <div className="h-full rounded-2xl bg-surface p-7 shadow-soft">
                <h3 className="font-serif text-2xl">
                  {t(lang, COPY.gap.studentsCard.heading)}
                </h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {COPY.gap.studentsCard.stats.map((s) => (
                    <li key={s.big} className="flex items-baseline gap-3">
                      <span className="font-serif text-3xl text-coral">{s.big}</span>
                      <span className="text-ink-muted">{t(lang, s.label)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            {/* School card */}
            <Reveal delay={90}>
              <div className="h-full rounded-2xl bg-surface p-7 shadow-soft">
                <h3 className="font-serif text-2xl">
                  {t(lang, COPY.gap.schoolCard.heading)}
                </h3>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="font-serif text-3xl text-coral">
                    {COPY.gap.schoolCard.stat.big}
                  </span>
                  <span className="text-ink-muted">
                    {t(lang, COPY.gap.schoolCard.stat.label)}
                  </span>
                </div>
                <p className="mt-4 text-ink-muted">{t(lang, COPY.gap.schoolCard.body)}</p>
              </div>
            </Reveal>
          </div>
          <Reveal>
            <p className="mt-10 max-w-3xl font-serif text-2xl leading-snug">
              {t(lang, COPY.gap.callout.part1)}
              <em className="text-coral not-italic">{t(lang, COPY.gap.callout.part2)}</em>
            </p>
          </Reveal>
          <Reveal>
            <p className="mt-6 text-sm text-ink-muted">{t(lang, COPY.gap.source)}</p>
          </Reveal>
        </div>
      </section>

      {/* ── §4 SOLUTION ─────────────────────────────────────────────── */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <Eyebrow>{t(lang, COPY.solution.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.solution.title)}
            </h2>
            <ul className="mt-8 flex flex-col gap-6">
              {COPY.solution.points.map((p, i) => (
                <li key={i} className="flex gap-4">
                  <span
                    className="mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-full font-serif text-sm text-sage-deep"
                    style={{ background: 'rgba(184,197,166,0.4)' }}
                    aria-hidden
                  >
                    ✓
                  </span>
                  <div>
                    <h3 className="font-serif text-xl">{t(lang, p.title)}</h3>
                    <p className="mt-1 text-ink-muted">{t(lang, p.desc)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <blockquote className="mt-10 border-l-2 border-coral pl-5">
              <p className="font-serif text-2xl italic leading-snug text-ink">
                {t(lang, COPY.solution.pullQuote)}
              </p>
              <footer className="mt-3 text-sm text-ink-muted">
                {t(lang, COPY.solution.pullQuoteCaption)}
              </footer>
            </blockquote>
          </Reveal>
          <Reveal delay={120}>
            <figure>
              <ZoomableShot
                src={shotChat}
                alt={sv ? 'Elevante-chatt med svar och källhänvisningar ur lektionen' : 'Elevante chat with answers and source citations from the lesson'}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="h-auto w-full rounded-2xl shadow-lift"
              />
              <figcaption className="eyebrow mt-4">
                {sv ? 'Fråga Elevante · svar med källor' : 'Ask Elevante · answers with sources'}
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ── §5 HOW ──────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.how.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.how.title)}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {COPY.how.steps.map((step, i) => (
              <Reveal key={step.num} delay={i * 90}>
                <LoopStep
                  number={step.num}
                  title={t(lang, step.title)}
                  visual={
                    i === 0 ? <RecVisual sv={sv} /> :
                    i === 1 ? <TranscribeVisual sv={sv} /> :
                    <AskVisual sv={sv} />
                  }
                  body={t(lang, step.desc)}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── §6 PRODUCT ──────────────────────────────────────────────── */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.product.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.product.title)}
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-ink-secondary">
              {t(lang, COPY.product.lede)}
            </p>
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {COPY.product.cols.map((col, ci) => (
              <Reveal key={ci} delay={ci * 90}>
                <div className="h-full rounded-2xl bg-surface p-7 shadow-soft">
                  <h3 className="font-serif text-2xl">{t(lang, col.heading)}</h3>
                  <ul className="mt-4 flex flex-col gap-3">
                    {col.rows.map((row, ri) => (
                      <li key={ri} className="flex gap-3 text-ink-muted">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-coral" aria-hidden />
                        {t(lang, row)}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <Reveal>
              <figure>
                <ZoomableShot
                  src={shotElev}
                  alt={sv ? 'Elevens vy i Elevante med dagens lektioner' : "Student view in Elevante with today's lessons"}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="h-auto w-full rounded-2xl shadow-lift"
                />
                <figcaption className="eyebrow mt-4">
                  {sv ? 'Elevens vy · dagens lektioner' : "Student view · today's lessons"}
                </figcaption>
              </figure>
            </Reveal>
            <Reveal delay={90}>
              <figure>
                <ZoomableShot
                  src={shotKarta}
                  alt={sv ? 'Förståelsekarta i Elevante per klass och begrepp' : 'Understanding map in Elevante per class and concept'}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="h-auto w-full rounded-2xl shadow-lift"
                />
                <figcaption className="eyebrow mt-4">
                  {sv ? 'Lärarens förståelsekarta · per klass' : "Teacher's understanding map · per class"}
                </figcaption>
              </figure>
            </Reveal>
          </div>
          <Reveal>
            <p className="mt-6 text-sm text-ink-muted">{t(lang, COPY.product.source)}</p>
          </Reveal>
        </div>
      </section>

      {/* ── §7 DATAMOAT ─────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.datamoat.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.datamoat.title)}
            </h2>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-secondary">
              {t(lang, COPY.datamoat.lede.part1)}
              <em className="text-coral not-italic">{t(lang, COPY.datamoat.lede.emphasis)}</em>
              {t(lang, COPY.datamoat.lede.part2)}
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {COPY.datamoat.stages.map((stage, i) => (
              <Reveal key={i} delay={i * 90}>
                <div className="h-full rounded-2xl bg-surface p-6 shadow-soft">
                  <span className="font-serif text-2xl text-coral">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-3 font-serif text-xl">{t(lang, stage.title)}</h3>
                  <p className="mt-2 text-ink-muted">{t(lang, stage.desc)}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-14 max-w-xl">
            <Reveal>
              <NetworkReveal caption={t(lang, COPY.datamoat.caption)} />
            </Reveal>
          </div>
          <Reveal>
            <p className="mt-10 max-w-2xl text-lg text-ink-secondary">
              <span className="font-semibold text-ink">{t(lang, COPY.datamoat.loopStrip.part1)}</span>
              {t(lang, COPY.datamoat.loopStrip.part2)}
            </p>
          </Reveal>
          <Reveal>
            <p className="mt-6 text-sm text-ink-muted">{t(lang, COPY.datamoat.source)}</p>
          </Reveal>
        </div>
      </section>

      {/* ── §8 DIFF ──────────────────────────────────────────────────── */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.diff.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.diff.title)}
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-ink-secondary">
              <span className="font-semibold text-ink">{t(lang, COPY.diff.subheading.part1)}</span>
              {t(lang, COPY.diff.subheading.part2)}
            </p>
          </Reveal>
          <div className="mt-12 grid gap-x-14 gap-y-9 sm:grid-cols-2">
            {COPY.diff.items.map((item, i) => (
              <Reveal key={i} delay={(i % 2) * 80}>
                <div className="flex gap-5">
                  <span className="font-serif text-2xl text-coral">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="font-serif text-xl">{t(lang, item.title)}</h3>
                    <p className="mt-1.5 text-ink-muted">{t(lang, item.desc)}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-8 text-sm text-ink-muted">{t(lang, COPY.diff.source)}</p>
          </Reveal>
        </div>
      </section>

      {/* ── §9 AVANTI ────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.avanti.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.avanti.title)}
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-ink-secondary">
              {t(lang, COPY.avanti.lede)}
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {COPY.avanti.cards.map((card, i) => (
              <Reveal key={i} delay={i * 90}>
                <div className="h-full rounded-2xl bg-surface p-7 shadow-soft">
                  <h3 className="font-serif text-2xl">{t(lang, card.heading)}</h3>
                  <p className="mt-3 text-ink-muted">{t(lang, card.desc)}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-8 max-w-3xl text-xs text-ink-muted border-t border-ink/10 pt-5">
              {t(lang, COPY.avanti.disclaimer)}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── §10 MARKET ───────────────────────────────────────────────── */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.market.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.market.title)}
            </h2>
          </Reveal>
          <div className="mt-12">
            <ConcentricMarket
              rings={MARKET_RINGS.map((r) => ({
                radius: r.radius,
                color: r.color,
                value: r.value,
                label: t(lang, r.label),
                sub: t(lang, r.sub),
              }))}
            />
          </div>
          <Reveal>
            <p className="mt-10 max-w-2xl text-lg text-ink-secondary">
              <span className="font-semibold text-ink">{t(lang, COPY.market.adjacentStrip.label)}</span>
              {t(lang, COPY.market.adjacentStrip.body)}
            </p>
          </Reveal>
          <Reveal>
            <p className="mt-6 text-sm text-ink-muted">{t(lang, COPY.market.source)}</p>
          </Reveal>
        </div>
      </section>

      {/* ── §11 EXPANSION ────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.expansion.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.expansion.title)}
            </h2>
          </Reveal>
          <div className="mt-12 flex flex-col gap-6">
            {EXPANSION.map((phase, i) => (
              <Reveal key={i} delay={i * 120}>
                <div
                  className="rounded-2xl bg-surface p-7 shadow-soft"
                  style={{ marginLeft: `${i * 2}rem` }}
                >
                  <span className="eyebrow text-coral">{t(lang, phase.tag)}</span>
                  <h3 className="mt-2 font-serif text-2xl">{t(lang, phase.region)}</h3>
                  <p className="mt-1 text-ink-muted">{t(lang, phase.students)}</p>
                  <p className="mt-3 font-serif text-xl text-ink">
                    {phase.tam}{' '}
                    <span className="text-base font-normal text-ink-muted">
                      {t(lang, COPY.expansion.perCardSub)}
                    </span>
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-10 max-w-2xl text-lg text-ink-secondary">
              {t(lang, COPY.expansion.anchorStrip.part1)}
              <span className="text-coral">{t(lang, COPY.expansion.anchorStrip.part2)}</span>
            </p>
          </Reveal>
          <Reveal>
            <p className="mt-6 text-sm text-ink-muted">{t(lang, COPY.expansion.source)}</p>
          </Reveal>
        </div>
      </section>

      {/* ── §12 BUSINESSMODEL ────────────────────────────────────────── */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.businessmodel.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.businessmodel.title)}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {COPY.businessmodel.kpis.map((kpi, i) => (
              <Reveal key={i} delay={i * 90}>
                <div className="h-full rounded-2xl bg-surface p-7 shadow-soft">
                  <p className="font-serif text-4xl text-ink">{kpi.value}</p>
                  <p className="mt-3 text-ink-muted">{t(lang, kpi.label)}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-10 max-w-2xl text-lg text-ink-secondary">
              <span className="font-semibold text-ink">{t(lang, COPY.businessmodel.callout.part1)}</span>
              {t(lang, COPY.businessmodel.callout.part2)}
            </p>
          </Reveal>
          <Reveal>
            <p className="mt-6 text-sm text-ink-muted">{t(lang, COPY.businessmodel.source)}</p>
          </Reveal>
        </div>
      </section>

      {/* ── §13 NUMBERS ──────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content grid items-start gap-12 md:grid-cols-2">
          <Reveal>
            <Eyebrow>{t(lang, COPY.numbers.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.numbers.title)}
            </h2>
            <ol className="mt-8 flex flex-col gap-6">
              {COPY.numbers.milestones.map((m, i) => (
                <li key={i} className="flex gap-5">
                  <span className="font-serif text-2xl text-coral">{m.label}</span>
                  <p className="text-ink-muted">{t(lang, m.desc)}</p>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-sm text-ink-muted">{t(lang, COPY.numbers.source)}</p>
          </Reveal>
          <Reveal delay={120}>
            <StackedCurve
              categories={ARR.categories}
              unit={ARR.unit}
              series={[{ label: 'ARR', color: 'rgba(255,122,107,0.22)', values: ARR.values }]}
              ariaLabel={sv ? 'ARR-prognos 2026–2031, från 0 till 100 MSEK.' : 'ARR forecast 2026–2031, from 0 to 100 MSEK.'}
            />
          </Reveal>
        </div>
      </section>

      {/* ── §14 TRACTION ─────────────────────────────────────────────── */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.traction.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.traction.title)}
            </h2>
          </Reveal>
          <Timeline
            items={TRACTION.map((m) => ({
              tag: t(lang, m.tag),
              title: t(lang, m.title),
              desc: t(lang, m.desc),
            }))}
          />
          <Reveal>
            <p className="mt-8 text-sm text-ink-muted">{t(lang, COPY.traction.source)}</p>
          </Reveal>
        </div>
      </section>

      {/* ── §15 POSITIONING ──────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.positioning.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.positioning.title)}
            </h2>
          </Reveal>
          <div className="mt-12 flex flex-col gap-3">
            {COPY.positioning.rows.map((row, i) => (
              <Reveal key={i} delay={i * 60}>
                <div
                  className={`grid grid-cols-1 gap-2 rounded-2xl p-5 sm:grid-cols-3 ${
                    row.isElevante
                      ? 'bg-ink text-canvas shadow-lift'
                      : 'bg-surface shadow-soft'
                  }`}
                >
                  <p className={`font-serif text-lg ${row.isElevante ? 'text-canvas' : 'text-ink'}`}>
                    {t(lang, row.category)}
                  </p>
                  <p className={`text-sm ${row.isElevante ? 'text-canvas/60' : 'text-ink-muted'}`}>
                    {row.examples}
                  </p>
                  <p className={`text-sm ${row.isElevante ? 'text-canvas/90' : 'text-ink-muted'}`}>
                    {t(lang, row.desc)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-8 text-sm text-ink-muted">{t(lang, COPY.positioning.source)}</p>
          </Reveal>
        </div>
      </section>

      {/* ── §16 TEAM ─────────────────────────────────────────────────── */}
      <section className="bg-surface-soft px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.team.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.team.title)}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {COPY.team.people.map((person, i) => (
              <Reveal key={person.name} delay={i * 90}>
                <div className="h-full rounded-2xl bg-surface p-7 shadow-soft">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink font-serif text-lg text-canvas">
                      {person.initials}
                    </span>
                    <div>
                      <p className="font-serif text-xl text-ink">{person.name}</p>
                      <p className="text-sm text-ink-muted">{t(lang, person.role)}</p>
                    </div>
                  </div>
                  <p className="mt-5 text-ink-muted">{t(lang, person.bio)}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-10 max-w-2xl text-lg text-ink-secondary">
              <span className="font-semibold text-ink">{t(lang, COPY.team.backedBy.label)}</span>
              {t(lang, COPY.team.backedBy.body)}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── §17 INVESTCASE ───────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.investcase.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.investcase.title)}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {COPY.investcase.items.map((item, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="h-full rounded-2xl bg-surface p-7 shadow-soft">
                  <h3 className="font-serif text-xl">{t(lang, item.title)}</h3>
                  <p className="mt-3 text-ink-muted">{t(lang, item.desc)}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-8 text-sm text-ink-muted">{t(lang, COPY.investcase.source)}</p>
          </Reveal>
        </div>
      </section>

      {/* ── §18 ASK ──────────────────────────────────────────────────── */}
      <section className="bg-ink px-6 py-24 text-canvas sm:px-10 sm:py-32">
        <div className="container-content grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <p className="eyebrow flex items-center gap-3 text-canvas/60">
              <span className="inline-block h-px w-9 bg-coral" aria-hidden />
              {t(lang, COPY.ask.eyebrow)}
            </p>
            <h2 className="mt-5 font-serif text-5xl text-canvas sm:text-6xl">
              {t(lang, COPY.ask.title.part1)}
              <em className="text-coral not-italic">{COPY.ask.title.accent}</em>
              <span className="text-coral">.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg text-canvas/70">
              {t(lang, COPY.ask.lede)}
            </p>
            <p className="mt-6 max-w-md text-canvas/70">
              {t(lang, COPY.ask.investorWish)}
            </p>
            <p className="mt-4 max-w-md text-canvas/70">
              <span className="font-semibold text-canvas">{t(lang, COPY.ask.plus.label)}</span>
              {t(lang, COPY.ask.plus.body)}
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="flex flex-col gap-8">
              <div className="grid gap-5 sm:grid-cols-1">
                {ASK.uses.map((use, i) => (
                  <div key={i} className="rounded-2xl bg-canvas/10 p-5">
                    <h3 className="font-serif text-xl text-canvas">{t(lang, use.title)}</h3>
                    <p className="mt-2 text-canvas/70">{t(lang, use.desc)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-canvas/20 pt-6 leading-relaxed text-canvas/60">
                <CountUp value={ASK.amount} suffix=" MSEK" className="font-serif text-3xl text-coral" />
                <p className="mt-2 text-sm">{COPY.ask.contact}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── §19 SOURCES ──────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:px-10 sm:py-28">
        <div className="container-content">
          <Reveal>
            <Eyebrow>{t(lang, COPY.sources.eyebrow)}</Eyebrow>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
              {t(lang, COPY.sources.title)}
            </h2>
          </Reveal>
          <Reveal>
            <ul className="mt-10 flex flex-col gap-3">
              {COPY.sources.lines.map((line, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink-muted">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-none rounded-full bg-coral" aria-hidden />
                  <span>
                    <span className="font-medium text-ink">{t(lang, line.claim)}</span>
                    {' — '}
                    {line.citation}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal>
            <div className="mt-10 flex flex-col gap-3 border-t border-ink/10 pt-8 text-xs text-ink-muted">
              <p>
                <span className="font-semibold">{t(lang, COPY.sources.footer.perStudentFunding.label)}</span>
                {t(lang, COPY.sources.footer.perStudentFunding.body)}
              </p>
              <p>
                <span className="font-semibold">{t(lang, COPY.sources.footer.forecasts.label)}</span>
                {t(lang, COPY.sources.footer.forecasts.body)}
              </p>
              <p>
                <span className="font-semibold">{t(lang, COPY.sources.footer.datasovereignty.label)}</span>
                {t(lang, COPY.sources.footer.datasovereignty.body)}
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
