// apps/web/app/investerare/content.ts
// Bilingual content module for the Elevante investor deck web page.
// All Swedish prose is verbatim from elevante-deck/build-deck.js.
// English translations are verbatim from elevante-deck/i18n.js where available;
// where no key exists the string has been faithfully translated (noted inline).
// No React imports — plain data/functions only.

export type Lang = 'sv' | 'en';
export type L = Record<Lang, string>;

export const t = (l: Lang, s: L) => s[l];

// ── §2 Problem (slide2_problem) — verbatim ────────────────────────
export interface ProblemStat {
  big: string;
  countTo?: number;
  countSuffix?: string;
  label: L;
}

export const PROBLEM_STATS: readonly ProblemStat[] = [
  { big: '8 av 10', label: { sv: 'svenska lärare har en orimligt hög arbetsbelastning', en: '8 in 10 Swedish teachers carry an unreasonable workload' } },
  { big: '2 av 3', label: { sv: 'saknar förutsättningar att ge stöd till alla elever', en: '2 in 3 lack the conditions to support every student' } },
  { big: '50 %', countTo: 50, countSuffix: ' %', label: { sv: 'av eleverna kan koncentrera sig på lektionerna', en: 'of students can concentrate during lessons' } },
  { big: '10 600', countTo: 10600, label: { sv: 'lärare beräknas saknas i Sverige år 2038', en: 'teachers projected missing in Sweden by 2038' } },
  { big: '9 av 10', label: { sv: 'lärare ägnar tid åt annat än undervisning', en: '9 in 10 teachers spend time on things other than teaching' } },
  { big: '3 av 4', label: { sv: 'lärare känner sig stressade regelbundet', en: '3 in 4 teachers feel stressed regularly' } },
  { big: '1 av 5', label: { sv: 'lärare vill lämna yrket', en: '1 in 5 teachers want to leave the profession' } },
  { big: '1 av 2', label: { sv: 'elever på högstadiet och gymnasiet är stressade flera gånger i veckan', en: '1 in 2 lower- and upper-secondary students are stressed several times a week' } },
];
export const PROBLEM_SOURCE: L = {
  sv: 'Källor: 8 av 10, 9 av 10 & 1 av 5 — Sveriges Lärare, "Med orimliga förutsättningar" (2024). 2 av 3, 3 av 4, hälften & 1 av 2 (elevstress) — Skolverket, Attityder till skolan 2024. 10 600 — Skolverket, Lärarprognos 2024.',
  en: 'Sources: 8 in 10, 9 in 10 & 1 in 5 — Sveriges Lärare (2024). 2 in 3, 3 in 4, half & 1 in 2 (student stress) — Skolverket, Attitudes to School 2024. 10,600 — Skolverket, Teacher Forecast 2024.',
};

export const ARR = {
  categories: ['26/27', '27/28', '28/29', '29/30', '30/31'],
  values: [0, 8, 20, 50, 100], // MSEK
  unit: 'MSEK ARR',
};

export const MARKET_RINGS = [
  // Radie ∝ √(elevtal) → cirkelns YTA speglar antalet elever (perceptuellt korrekt).
  // multiple = ungefärlig jämförelse mot den svenska hemmamarknaden (1×).
  { radius: 20, color: 'var(--color-coral)', value: '316 554', multiple: '1×', label: { sv: 'gymnasieelever i Sverige', en: 'upper-secondary students in Sweden' }, sub: { sv: 'Hemmamarknad — start: Stockholmsregionen, 66 891 elever · 231 skolor.', en: 'Home market — start: Stockholm region, 66,891 students · 231 schools.' } },
  { radius: 43, color: 'var(--color-sage-deep)', value: '1,48 milj.', multiple: '≈ 5×', label: { sv: 'gymnasieelever i Norden', en: 'upper-secondary students in the Nordics' }, sub: { sv: '≈ 5× hemmamarknaden. Naturlig expansion efter svensk validering.', en: '≈ 5× the home market. Natural expansion after Swedish validation.' } },
  { radius: 150, color: 'var(--color-ink)', value: '18,3 milj.', multiple: '≈ 58×', label: { sv: 'elever i EU27', en: 'students in the EU27' }, sub: { sv: '≈ 58× hemmamarknaden — den stora möjligheten. Samma språkmodell per marknad.', en: '≈ 58× the home market — the big opportunity. Same language model per market.' } },
];

export const EXPANSION = [
  { tag: { sv: 'FAS 1 · PILOT', en: 'PHASE 1 · PILOT' }, region: { sv: 'Sverige', en: 'Sweden' }, students: { sv: '316 554 elever', en: '316,554 students' }, tam: '≈ 158 MSEK' },
  { tag: { sv: 'FAS 2 · FÖRSTAMARKNAD', en: 'PHASE 2 · FIRST MARKET' }, region: { sv: 'Norden', en: 'The Nordics' }, students: { sv: '1,48 milj. elever', en: '1.48M students' }, tam: '≈ 740 MSEK' },
  { tag: { sv: 'FAS 3 · EXPANSION', en: 'PHASE 3 · EXPANSION' }, region: { sv: 'Europa · EU27', en: 'Europe · EU27' }, students: { sv: '18,3 milj. elever', en: '18.3M students' }, tam: '≈ 9,1 mdSEK' },
];

export const ASK = {
  uses: [
    { title: { sv: 'Konvertera piloten', en: 'Convert the pilot' }, desc: { sv: 'Pilot → betalande skolor i Stockholmsregionen.', en: 'Pilot → paying schools across the Stockholm region.' } },
    { title: { sv: 'Härda EU-pipelinen', en: 'Harden the EU pipeline' }, desc: { sv: 'Extern säkerhets- och GDPR-granskning.', en: 'External security and GDPR review.' } },
    { title: { sv: 'Skala go-to-market', en: 'Scale go-to-market' }, desc: { sv: 'I Sverige och in i Norden.', en: 'Across Sweden and into the Nordics.' } },
  ],
};

// ── §17b De-risking: AI Act-riskskala (MiniRiskScale) ─────────────
// Ordning topp→botten: mest reglerad överst. Elevante vilar tryggt på
// "Begränsad risk" — med synlig höjd ned till nästa nivå.
export type RiskTone = 'banned' | 'high' | 'limited' | 'safe';
export interface RiskRung {
  level: L;
  note: L;
  tone: RiskTone;
  marker?: L;
  isElevante?: boolean;
}
// Förtydligande för kort 1 (Berget) — tre bevispunkter, var och en avväpnar
// en delfråga: suveränitet, social proof, inlåsning.
export const DERISK_PROOF: L[] = [
  { sv: '100 % i Sverige — immun mot US Cloud Act', en: '100% in Sweden — immune to the US Cloud Act' },
  { sv: 'Riksbanken är flaggskeppskund', en: 'The Riksbank is a flagship customer' },
  { sv: 'KB-Whisper är öppen källkod — flyttbar', en: 'KB-Whisper is open source — portable' },
];

// Förtydligande för kort 3 (evidens) — kontrasten branschen vs Elevante.
export const DERISK_CONTRAST: { bad: L; good: L } = {
  bad: { sv: 'De flesta EdTech: lovar resultat utan evidens', en: 'Most EdTech: promise results without evidence' },
  good: { sv: 'Elevante: mäter effekt i piloten först', en: 'Elevante: measures effect in the pilot first' },
};

export const RISK_LADDER: RiskRung[] = [
  {
    level: { sv: 'Oacceptabel risk', en: 'Unacceptable risk' },
    note: { sv: 'Känsloigenkänning i klassrum — förbjudet sedan 2025', en: 'Emotion recognition in classrooms — banned since 2025' },
    tone: 'banned',
  },
  {
    level: { sv: 'Hög risk', en: 'High risk' },
    note: { sv: 'Conformity assessment + CE-märkning innan lansering', en: 'Conformity assessment + CE marking before launch' },
    tone: 'high',
    marker: { sv: 'Verktyg som betygsätter & styr lärande', en: 'Tools that grade & steer learning' },
  },
  {
    level: { sv: 'Begränsad risk', en: 'Limited risk' },
    note: { sv: 'Bara transparenskrav — strikt RAG, svarar på innehåll', en: 'Transparency duties only — strict RAG, answers content' },
    tone: 'limited',
    marker: { sv: 'Elevante', en: 'Elevante' },
    isElevante: true,
  },
  {
    level: { sv: 'Minimal risk', en: 'Minimal risk' },
    note: { sv: 'Inga särskilda krav', en: 'No special requirements' },
    tone: 'safe',
  },
];

// ── Traction milestones (slide14_traction) ───────────────────────
export interface TractionItem {
  tag: L;
  title: L;
  desc: L;
}

export const TRACTION: TractionItem[] = [
  {
    tag: { sv: 'LOI', en: 'LOI' },
    title: { sv: 'Undertecknad LOI', en: 'Signed LOI' },
    desc: { sv: 'Amerikanska Gymnasiet — fem skolor, ~2 000 elever.', en: 'Amerikanska Gymnasiet — five schools, ~2,000 students.' },
  },
  {
    tag: { sv: 'PILOT', en: 'PILOT' },
    title: { sv: 'Dialog med Nacka gymnasium', en: 'In dialogue with Nacka Gymnasium' },
    desc: { sv: 'Samtal med rektor pågår. Pilot startar hösten 2026 (4–9 skolor).', en: 'Talks with the principal underway. Pilot starts autumn 2026 (4–9 schools).' },
  },
  {
    tag: { sv: 'PRODUKT', en: 'PRODUCT' },
    title: { sv: 'Produkten är byggd', en: 'The product is built' },
    desc: {
      sv: '18 månader på problemet, produkten färdig på två månader med AI-assisterad utveckling. Publik sajt live, app i 18 skärmar.',
      en: '18 months on the problem; the product was completed in two months with AI-assisted development. Public site live, app across 18 screens.',
    },
  },
  {
    tag: { sv: 'PARTNER', en: 'PARTNER' },
    title: { sv: 'Berget AI som partner', en: 'Berget AI as partner' },
    desc: { sv: 'EU-suverän inferens. Dialog om enterprise-villkor pågår.', en: 'EU-sovereign inference. Enterprise terms under discussion.' },
  },
];

// ── Main copy object ──────────────────────────────────────────────

export interface HeroCopy {
  eyebrow: L;
  tagline: L;
  title: L;
  lede: L;
  traction: L;
  preseedLine: L;
}

export interface ProblemCopy {
  eyebrow: L;
  title: L;
}

export interface GapCopy {
  eyebrow: L;
  title: L;
  studentsCard: {
    heading: L;
    stats: { big: string; label: L }[];
  };
  schoolCard: {
    heading: L;
    stat: { big: string; label: L };
    body: L;
  };
  callout: { part1: L; part2: L };
  source: L;
}

export interface SolutionCopy {
  eyebrow: L;
  title: L;
  points: { title: L; desc: L }[];
  pullQuote: L;
  pullQuoteCaption: L;
}

export interface HowCopy {
  eyebrow: L;
  title: L;
  steps: { num: string; title: L; desc: L }[];
}

export interface ProductCopy {
  eyebrow: L;
  title: L;
  lede: L;
  cols: {
    heading: L;
    rows: L[];
  }[];
  source: L;
}

export interface DatamoatCopy {
  eyebrow: L;
  title: L;
  lede: { part1: L; emphasis: L; part2: L };
  stages: { title: L; desc: L }[];
  caption: L;
  loopStrip: { part1: L; part2: L };
  source: L;
}

export interface DiffCopy {
  eyebrow: L;
  title: L;
  subheading: { part1: L; part2: L };
  items: { title: L; desc: L }[];
  source: L;
}

export interface AvantiCopy {
  eyebrow: L;
  title: L;
  lede: L;
  cards: { heading: L; desc: L }[];
  disclaimer: L;
}

export interface MarketCopy {
  eyebrow: L;
  title: L;
  adjacentStrip: { label: L; body: L };
  source: L;
}

export interface ExpansionCopy {
  eyebrow: L;
  title: L;
  anchorStrip: { part1: L; part2: L };
  perCardSub: L;
  source: L;
}

export interface BusinessModelCopy {
  eyebrow: L;
  title: L;
  kpis: { value: string; label: L }[];
  callout: { part1: L; part2: L };
  source: L;
}

export interface NumbersCopy {
  eyebrow: L;
  title: L;
  milestones: { label: string; desc: L }[];
  source: L;
}

export interface TractionCopy {
  eyebrow: L;
  title: L;
  source: L;
}

export interface PositioningCopy {
  eyebrow: L;
  title: L;
  rows: { category: L; examples: string; desc: L; isElevante: boolean }[];
  source: L;
}

export interface TeamCopy {
  eyebrow: L;
  title: L;
  people: { name: string; initials: string; role: L; bio: L }[];
  backedBy: { label: L; body: L };
}

export interface InvestCaseCopy {
  eyebrow: L;
  title: L;
  items: { title: L; desc: L }[];
  source: L;
}

export interface DeriskCopy {
  eyebrow: L;
  title: L;
  lede: L;
  cards: { worry: L; heading: L; body: L }[];
  scaleNote: L;
  source: L;
}

export interface AskCopy {
  eyebrow: L;
  title: { part1: L; accent: string };
  lede: L;
  investorWish: L;
  plus: { label: L; body: L };
  fundsTitle: L;
  fundsTotal: L;
  fundsSource: L;
  contact: string;
}

// ── §18 Use of funds — kapitalallokering (14,0 MSEK) ──
export interface FundSegment {
  label: L;
  amount: L;
  pct: number;
  color: string;
}
export const FUNDS: FundSegment[] = [
  { label: { sv: 'Personal (grundare, CTO, designer, CSO år 2)', en: 'Team (founders, CTO, designer, CSO yr 2)' }, amount: { sv: '5,5 MSEK', en: '5.5 MSEK' }, pct: 39, color: 'var(--color-coral)' },
  { label: { sv: 'Buffert för år 2 (förseningsrisk)', en: 'Year-2 buffer (delay risk)' }, amount: { sv: '3,0 MSEK', en: '3.0 MSEK' }, pct: 22, color: 'var(--color-sand)' },
  { label: { sv: 'Marknadsföring och försäljning', en: 'Marketing and sales' }, amount: { sv: '2,5 MSEK', en: '2.5 MSEK' }, pct: 18, color: 'var(--color-sage)' },
  { label: { sv: 'Produkt och teknik (infra, AI-drift)', en: 'Product and tech (infra, AI ops)' }, amount: { sv: '1,3 MSEK', en: '1.3 MSEK' }, pct: 9, color: 'var(--color-sage-deep)' },
  { label: { sv: 'Extern teknisk granskning', en: 'External technical review' }, amount: { sv: '0,6 MSEK', en: '0.6 MSEK' }, pct: 4, color: 'rgba(255,122,107,0.5)' },
  { label: { sv: 'Lokal och hårdvara', en: 'Office and hardware' }, amount: { sv: '0,6 MSEK', en: '0.6 MSEK' }, pct: 4, color: 'rgba(232,220,196,0.55)' },
  { label: { sv: 'Juridik, bokföring, försäkringar', en: 'Legal, accounting, insurance' }, amount: { sv: '0,5 MSEK', en: '0.5 MSEK' }, pct: 4, color: 'rgba(184,197,166,0.5)' },
];

export interface SourceLine {
  claim: L;
  citation: string;
}

export interface SourcesCopy {
  eyebrow: L;
  title: L;
  lines: SourceLine[];
  footer: {
    perStudentFunding: { label: L; body: L };
    forecasts: { label: L; body: L };
    datasovereignty: { label: L; body: L };
  };
}

export const COPY: {
  hero: HeroCopy;
  problem: ProblemCopy;
  gap: GapCopy;
  solution: SolutionCopy;
  how: HowCopy;
  product: ProductCopy;
  datamoat: DatamoatCopy;
  diff: DiffCopy;
  avanti: AvantiCopy;
  market: MarketCopy;
  expansion: ExpansionCopy;
  businessmodel: BusinessModelCopy;
  numbers: NumbersCopy;
  traction: TractionCopy;
  positioning: PositioningCopy;
  team: TeamCopy;
  investcase: InvestCaseCopy;
  derisk: DeriskCopy;
  ask: AskCopy;
  sources: SourcesCopy;
} = {

  // ── §1 Hero (slide1_title) ────────────────────────────────────────
  hero: {
    eyebrow: {
      sv: 'Pre-seed 2026 · 14 MSEK (€1,25M)',
      en: 'Pre-seed 2026 · 14 MSEK (€1.25M)',
    },
    tagline: {
      sv: 'minns allt du lär dig i skolan',
      en: 'remembers everything taught in class',
    },
    title: {
      // "Elevante" is a proper noun; the tagline follows as a subtitle
      sv: 'Elevante',
      en: 'Elevante',
    },
    lede: {
      sv:
        'Elevante spelar in och transkriberar lektionen — och ger varje elev en personlig AI-handledare ' +
        'som var i rummet, kan lektionen och kan eleven. Strikt på lärarens egna ord, aldrig påhittat.',
      en:
        'Elevante records and transcribes the lesson — and gives every student a personal AI tutor ' +
        'that was in the room, knows the lesson and knows the student. Strictly the teacher’s own words, never made up.',
    },
    traction: {
      sv: '18 månader i utveckling · LOI undertecknad · Pilot startar hösten 2026',
      en: '18 months in development · LOI signed · Pilot starts autumn 2026',
    },
    preseedLine: {
      sv: 'Pre-seed 2026 · 14 MSEK (€1,25M) · Presenterat för ',
      en: 'Pre-seed 2026 · 14 MSEK (€1.25M) · Presented to ',
    },
  },

  // ── §2 Problem (slide2_problem) ──────────────────────────────────
  problem: {
    eyebrow: {
      sv: 'Problemet',
      en: 'The problem',
    },
    title: {
      sv: 'Eleverna får inte ut vad de förtjänar av tiden i skolan',
      en: 'Students don’t get what they deserve from time in class',
    },
  },

  // ── §3 Gap (slide3_gap) ───────────────────────────────────────────
  gap: {
    eyebrow: {
      sv: 'Marknadsglappet',
      en: 'The market gap',
    },
    title: {
      sv: 'Eleverna tog AI till klassrummet. Skolan hängde inte med.',
      en: 'Students brought AI to the classroom. Schools didn’t keep up.',
    },
    studentsCard: {
      heading: { sv: 'Eleverna', en: 'Students' },
      stats: [
        { big: '70 %', label: { sv: 'av 12–19-åringar använder AI', en: 'of 12–19-year-olds use AI' } },
        { big: '50 %', label: { sv: 'använder AI istället för Google', en: 'use AI instead of Google' } },
        { big: '33 %', label: { sv: 'använder AI för skolarbete', en: 'use AI for schoolwork' } },
      ],
    },
    schoolCard: {
      heading: { sv: 'Skolan', en: 'Schools' },
      stat: {
        big: '78 %',
        label: {
          sv: 'av lärarna som inte använt AI saknar kunskapen att göra det.',
          en: 'of teachers who haven’t used AI lack the knowledge to do so.',
        },
      },
      body: {
        sv: 'Oreglerad konsument-AI fyller vakuumet — utan läroplan, utan skolans kontroll.',
        en: 'Unregulated consumer AI fills the vacuum — no curriculum, no school control.',
      },
    },
    callout: {
      part1: {
        sv: 'Skol-AI sköter admin, schema och betyg — ingen är i klassrummet när undervisningen sker. ',
        en: 'School AI handles admin, scheduling and grading — no one is in the classroom when teaching happens. ',
      },
      part2: {
        sv: 'Det tomma rummet fyller Elevante — ett lager ovanpå skolans system, utan systembyte.',
        en: 'Elevante fills the empty room — a layer on top of the school’s systems, with no system swap.',
      },
    },
    source: {
      sv: 'Källor: 70 % / 50 % / 33 % — Internetstiftelsen, Svenskarna och internet 2024. 78 % — OECD, TALIS 2024 (Sverige).',
      en: 'Sources: 70% / 50% / 33% — Internetstiftelsen, Svenskarna och internet 2024. 78% — OECD, TALIS 2024 (Sweden).',
    },
  },

  // ── §4 Solution (slide4_solution) ────────────────────────────────
  solution: {
    eyebrow: {
      sv: 'Lösningen',
      en: 'The solution',
    },
    title: {
      sv: 'Elevante är skolans svar på AI — inte ännu en chatbot',
      en: 'Elevante is the school’s answer to AI — not just another chatbot',
    },
    points: [
      {
        title: { sv: 'Strikt RAG mot lektionen', en: 'Strict RAG on the lesson' },
        desc: {
          sv: 'AI:n svarar bara på lärarens egna ord — inga hallucinationer, alltid med källhänvisning.',
          en: 'The AI answers only from the teacher’s own words — no hallucinations, always cited.',
        },
      },
      {
        title: { sv: 'Känner lektionen — och eleven', en: 'Knows the lesson — and the student' },
        desc: {
          sv: 'Svar anpassade till elevens nivå, styrkor och luckor. Bygger en lärprofil över tid.',
          en: 'Answers tailored to the student’s level, strengths and gaps. Builds a learner profile over time.',
        },
      },
      {
        title: { sv: 'Läraren får insyn och äger sin data', en: 'Teachers get insight and own their data' },
        desc: {
          sv: 'Ser exakt vad eleverna fastnar på. All data stannar hos skolan.',
          en: 'Sees exactly where students get stuck. All data stays with the school.',
        },
      },
      {
        title: { sv: 'Repetition, provplugg, veckosammanfattning', en: 'Review, exam prep, weekly summary' },
        desc: {
          sv: 'Eleven kommer ikapp i egen takt; föräldrar får veckans innehåll.',
          en: 'Students catch up at their own pace; parents get the week’s content.',
        },
      },
    ],
    pullQuote: {
      sv: 'En AI-handledare\nsom var i rummet.',
      en: 'An AI tutor\nthat was in the room.',
    },
    pullQuoteCaption: {
      sv: 'ChatGPT vet vad osmos är — inte hur din lärare förklarade det i torsdags.',
      en: 'ChatGPT knows what osmosis is — not how your teacher explained it on Thursday.',
    },
  },

  // ── §5 How (slide5_how) ──────────────────────────────────────────
  how: {
    eyebrow: {
      sv: 'Så fungerar det',
      en: 'How it works',
    },
    title: {
      sv: 'Tre steg. Två tryck. En lärare.',
      en: 'Three steps. Two taps. One teacher.',
    },
    steps: [
      {
        num: '01',
        title: { sv: 'Läraren spelar in', en: 'The teacher records' },
        desc: {
          sv: 'Från mobilen — schemat kopplar inspelningen till rätt lektion automatiskt. Max två tryck.',
          en: 'From the phone — the schedule links the recording to the right lesson automatically. Two taps max.',
        },
      },
      {
        num: '02',
        title: { sv: 'Elevante transkriberar', en: 'Elevante transcribes' },
        desc: {
          sv: 'KB-Whisper transkriberar på svenska och indexerar tillsammans med lärarens material.',
          en: 'KB-Whisper transcribes Swedish and indexes it with the teacher’s materials.',
        },
      },
      {
        num: '03',
        title: { sv: 'Eleven frågar', en: 'The student asks' },
        desc: {
          sv: 'Strikt RAG ger svar i lärarens egna ord — alltid med citat ur lektionen.',
          en: 'Strict RAG answers in the teacher’s own words — always with citations from the lesson.',
        },
      },
    ],
  },

  // ── §6 Product (slide6_value) ────────────────────────────────────
  product: {
    eyebrow: {
      sv: 'Produkten',
      en: 'The product',
    },
    title: {
      sv: 'Vad eleven får — och vad läraren ser',
      en: 'What the student gets — and what the teacher sees',
    },
    lede: {
      sv: 'Samma inspelade lektion ger värde åt båda håll — i realtid.',
      en: 'The same recorded lesson creates value both ways — in real time.',
    },
    cols: [
      {
        heading: { sv: 'För eleven', en: 'For the student' },
        rows: [
          {
            sv: 'Ställer frågor till lektionen — strikt RAG på lärarens egna ord.',
            en: 'Asks questions about the lesson — strict RAG on the teacher’s own words.',
          },
          {
            sv: 'Gör AI-övningsprov på det som sagts och lärarens uppladdade material.',
            en: 'Takes AI practice tests on what was said and the teacher’s uploaded material.',
          },
          {
            sv: 'Repeterar och pluggar inför prov i egen takt.',
            en: 'Reviews and studies for tests at their own pace.',
          },
        ],
      },
      {
        heading: { sv: 'För läraren', en: 'For the teacher' },
        rows: [
          {
            sv: 'Ser vilka frågor eleverna ställer — och var de fastnar.',
            en: 'Sees which questions students ask — and where they get stuck.',
          },
          {
            sv: 'Vet kring vilka delar av lektionen frågorna kommer.',
            en: 'Knows which parts of the lesson the questions cluster around.',
          },
          {
            sv: 'Följer hur elevernas övningsprov går.',
            en: 'Tracks how students’ practice tests go.',
          },
        ],
      },
    ],
    source: {
      sv: 'Funktioner i den byggda produkten — se elevante.se / demo.',
      en: 'Features in the live product — see elevante.se / demo.',
    },
  },

  // ── §7 Datamoat (slide7_datamoat) ────────────────────────────────
  datamoat: {
    eyebrow: {
      sv: 'Datamoat · på sikt',
      en: 'Data moat · over time',
    },
    title: {
      sv: 'Det som inte går att kopiera',
      en: 'What cannot be copied',
    },
    lede: {
      part1: {
        sv: 'Varje inspelad lektion blir strukturerad data. En mattelärare i Stockholm kan se hur en hyllad lärare i Umeå förklarar derivata — ',
        en: 'Every recorded lesson becomes structured data. A maths teacher in Stockholm can see how a celebrated teacher in Umeå explains derivatives — ',
      },
      emphasis: {
        sv: 'och anpassa det.',
        en: 'and adapt it.',
      },
      part2: {
        sv: ' Med tiden visar Elevante nya lärare hur de bäst lägger upp sina egna lektioner.',
        en: ' Over time Elevante shows new teachers how to best structure their own lessons.',
      },
    },
    stages: [
      {
        title: { sv: 'Fler lektioner', en: 'More lessons' },
        desc: { sv: 'Varje lektion blir strukturerad data.', en: 'Every lesson becomes structured data.' },
      },
      {
        title: { sv: 'Mönster framträder', en: 'Patterns emerge' },
        desc: { sv: 'Elevante ser vilken pedagogik som leder till förståelse.', en: 'Elevante sees which teaching leads to understanding.' },
      },
      {
        title: { sv: 'Lärare får vägledning', en: 'Teachers get guidance' },
        desc: { sv: 'Nya lärare lägger upp sina egna lektioner bättre.', en: 'New teachers structure their own lessons better.' },
      },
    ],
    // caption for the network/flywheel graph
    caption: {
      sv: 'Dataflywheelen — fler lektioner ger bättre mönster, ger bättre vägledning, lockar fler lärare.',
      en: 'The data flywheel — more lessons yield better patterns, yield better guidance, attract more teachers.',
    },
    loopStrip: {
      part1: { sv: '↻  Fler lärare ger fler lektioner. ', en: '↻  More teachers means more lessons. ' },
      part2: {
        sv: 'Underlaget växer för varje lektion — ett försprång som inte går att köpa ikapp.',
        en: 'The dataset grows with every lesson — a lead you can’t buy your way past.',
      },
    },
    source: {
      sv: 'Strategisk hypotes — nätverkseffekten realiseras på sikt, i takt med att antalet inspelade lektioner växer.',
      en: 'Strategic hypothesis — the network effect is realised over time as the number of recorded lessons grows.',
    },
  },

  // ── §8 Diff (slide8_diff) ─────────────────────────────────────────
  diff: {
    eyebrow: {
      sv: 'Differentiering',
      en: 'Differentiation',
    },
    title: {
      sv: 'Byggt för svensk skola — med EU-datasuveränitet',
      en: 'Built for Swedish schools — with EU data sovereignty',
    },
    subheading: {
      part1: { sv: 'GDPR är ingen begränsning — ', en: 'GDPR isn’t a constraint — ' },
      part2: { sv: 'det är en del av produktdesignen.', en: 'it’s part of the product design.' },
    },
    items: [
      {
        title: { sv: 'EU-datasuveränitet', en: 'EU data sovereignty' },
        desc: {
          sv: 'Elevdata lagras i EU. Svensk tal-till-text körs EU-suveränt via Berget AI; råljud raderas direkt.',
          en: 'Student data is stored in the EU. Swedish speech-to-text runs EU-sovereign via Berget AI; raw audio is deleted immediately.',
        },
      },
      {
        title: { sv: 'Svensk språkprecision', en: 'Swedish language precision' },
        desc: {
          sv: 'KB-Whisper ger 47 % färre transkriberingsfel än OpenAI Whisper på svenska.',
          en: 'KB-Whisper makes 47% fewer transcription errors than OpenAI Whisper on Swedish.',
        },
      },
      {
        title: { sv: 'Strikt RAG', en: 'Strict RAG' },
        desc: {
          sv: 'Svar bara från lektionens innehåll. Ingen påhittad fakta, alltid källhänvisning.',
          en: 'Answers only from the lesson’s content. No invented facts, always cited.',
        },
      },
      {
        title: { sv: 'Färdig compliance', en: 'Compliance ready' },
        desc: {
          sv: 'PUB-avtal, DPIA och AI Act-dokumentation klart — kortar skolornas beslut från månader till veckor.',
          en: 'DPA, DPIA and AI Act documentation in place — cuts schools’ decision from months to weeks.',
        },
      },
    ],
    source: {
      sv:
        'KB-Whisper 47 %: KBLab, Kungliga biblioteket. EU-datasuveränitet avser datalagring i EU + EU-suverän transkribering via Berget AI; ' +
        'generering (Claude) och drift körs hos leverantörer under DPA/SCC. Compliance: PUB-avtal/DPIA, Elevante.',
      en:
        'KB-Whisper 47%: KBLab, National Library of Sweden. EU data sovereignty means storage in the EU + EU-sovereign transcription via Berget AI; ' +
        'generation (Claude) and ops run with vendors under DPA/SCC. Compliance: DPA/DPIA, Elevante.',
    },
  },

  // ── §9 Avanti (slide9_avanti) ────────────────────────────────────
  avanti: {
    eyebrow: {
      sv: 'Vision',
      en: 'Vision',
    },
    title: {
      sv: 'Nästa steg: den syntetiska läraren',
      en: 'Next step: the synthetic teacher',
    },
    lede: {
      sv: 'Varje inspelad lektion är träningsdata. På sikt blir textchatten en talande, digital lärare.',
      en: 'Every recorded lesson is training data. Over time the text chat becomes a speaking, digital teacher.',
    },
    cards: [
      {
        heading: { sv: 'Avanti Studios', en: 'Avanti Studios' },
        desc: {
          sv:
            'Gustaf Hagman (grundare LeoVegas) och Jonas Delin (grundare Authentic Gaming) bygger ' +
            'fotorealistiska realtidskloner i Unreal Engine + Metahuman — bevisat i live casino.',
          en:
            'Gustaf Hagman (founder of LeoVegas) and Jonas Delin (founder of Authentic Gaming) build ' +
            'photorealistic real-time clones in Unreal Engine + Metahuman — proven in live casino.',
        },
      },
      {
        heading: { sv: 'Överfört till Elevante', en: 'Brought to Elevante' },
        desc: {
          sv: 'Lärarens röst, rörelser och stil syntetiseras till en digital lärare — en per skola, ämne och språk.',
          en: 'The teacher’s voice, movements and style are synthesised into a digital teacher — one per school, subject and language.',
        },
      },
    ],
    disclaimer: {
      sv:
        'Hagmans och Delins bakgrund: offentliga uppgifter. Erbjudandet om teknik-tillgång är en muntlig, icke-bindande avsiktsförklaring ' +
        'från Avanti-grundaren när tjänsten är redo. Avanti är inte del av grundarteamet och utgör ingen bunden investering.',
      en:
        'Hagman’s and Delin’s backgrounds: public information. The offer of technology access is a verbal, non-binding letter of intent ' +
        'from the Avanti founder once the service is ready. Avanti is not part of the founding team and is not a committed investment.',
    },
  },

  // ── §10 Market (slide10_market) ──────────────────────────────────
  market: {
    eyebrow: {
      sv: 'Marknad',
      en: 'Market',
    },
    title: {
      sv: 'Från svensk gymnasieskola till 18 miljoner EU-elever',
      en: 'From Swedish upper secondary to 18 million EU students',
    },
    adjacentStrip: {
      label: { sv: 'Adjacent marknad: ', en: 'Adjacent market: ' },
      body: {
        sv: 'samma motor funkar bortom gymnasiet — företagsakademier, yrkes- och vuxenutbildning lär på samma sätt, med högre budget och betalningsvilja.',
        en: 'the same engine works beyond upper secondary — corporate academies, vocational and adult education teach the same way, with higher budgets and willingness to pay.',
      },
    },
    source: {
      sv: 'Sverige/Stockholm: Skolverkets gymnasieregister 2024. Norden/EU: Eurostat 2023 (ISCED 3) — på den basen rymmer Sverige 574 724 elever.',
      en: 'Sweden/Stockholm: Skolverket upper-secondary register 2024. Nordics/EU: Eurostat 2023 (ISCED 3) — on that basis Sweden holds 574,724 students.',
    },
  },

  // ── §11 Expansion (slide11_expansion) ────────────────────────────
  expansion: {
    eyebrow: {
      sv: 'Expansion',
      en: 'Expansion',
    },
    title: {
      sv: 'Sverige först. Norden som förstamarknad. Sedan Europa.',
      en: 'Sweden first. The Nordics as first market. Then Europe.',
    },
    anchorStrip: {
      part1: {
        sv: '500 SEK/elev/år är en bråkdel av en procent av per-elev-finansieringen',
        en: '500 SEK/student/year is a fraction of a percent of per-student funding',
      },
      part2: {
        sv: ' i varje kartlagt land. Höga-fit-marknader utöver Norden: Polen och Italien.',
        en: ' in every country mapped. High-fit markets beyond the Nordics: Poland and Italy.',
      },
    },
    perCardSub: {
      sv: 'potentiell marknad vid 500 SEK/elev/år',
      en: 'potential market at 500 SEK/student/year',
    },
    source: {
      sv:
        'Potentiell marknad = elevtal × 500 SEK/elev/år (vid full täckning). Elevtal: Skolverkets gymnasieregister 2024 (SE) + Eurostat 2023, ISCED 3 (Norden, EU27). ' +
        'Per-elev-finansiering: OECD, Education at a Glance 2024. ARR-prognosen (≈ 14 % av Nordens marknad år 5) är Elevantes estimat.',
      en:
        'Potential market = students × 500 SEK/student/year (at full coverage). Students: Skolverket upper-secondary register 2024 (SE) + Eurostat 2023, ISCED 3 (Nordics, EU27). ' +
        'Per-student funding: OECD, Education at a Glance 2024. The ARR forecast (≈ 14% of the Nordic market in year 5) is Elevante’s estimate.',
    },
  },

  // ── §12 Business model (slide12_businessmodel) ───────────────────
  businessmodel: {
    eyebrow: {
      sv: 'Affärsmodell',
      en: 'Business model',
    },
    title: {
      sv: '500 SEK per elev och år. Enhetsekonomi som håller.',
      en: '500 SEK per student per year. Unit economics that hold.',
    },
    kpis: [
      { value: '500 SEK', label: { sv: 'per elev och år, betald av skolan', en: 'per student per year, paid by the school' } },
      { value: '68 %', label: { sv: 'bruttomarginal i pilot, stärks vid skalning', en: 'gross margin in pilot, strengthens at scale' } },
      { value: '< 1 mån', label: { sv: 'payback på CAC (branschsnitt 6–18 mån)', en: 'CAC payback (industry avg 6–18 mo)' } },
      { value: '125×', label: { sv: 'LTV / CAC', en: 'LTV / CAC' } },
    ],
    callout: {
      part1: { sv: '500 SEK är under 0,5 % av skolpengen', en: '500 SEK is under 0.5% of the per-student grant' },
      part2: {
        sv: ' — och ryms i samma budget som digitala läromedel (500–1 500 SEK), som Elevante kompletterar snarare än ersätter.',
        en: ' — and fits the same budget as digital textbooks (500–1,500 SEK), which Elevante complements rather than replaces.',
      },
    },
    source: {
      sv:
        'Skolpeng/per-elev-finansiering: Skolverkets kostnadsstatistik 2024 (≈ 100 000–130 000 SEK/gymnasieelev). AI-kostnaden är försumbar (under 0,3 MSEK även vid 60 % marknadsandel i Stockholm). ' +
        'Bruttomarginal, payback och LTV/CAC är Elevantes egna estimat.',
      en:
        'Per-student grant/funding: Skolverket cost statistics 2024 (≈ 100,000–130,000 SEK/upper-secondary student). AI cost is negligible (under 0.3 MSEK even at 60% market share in Stockholm). ' +
        'Gross margin, payback and LTV/CAC are Elevante’s own estimates.',
    },
  },

  // ── §13 Numbers (slide13_numbers) ────────────────────────────────
  numbers: {
    eyebrow: {
      sv: 'Affären i siffror',
      en: 'The business in numbers',
    },
    title: {
      sv: 'Från pilot till 100 MSEK ARR på fem år',
      en: 'From pilot to 100 MSEK ARR in five years',
    },
    milestones: [
      {
        label: 'M13',
        desc: {
          sv: 'Första betalande kund — kommersiell lansering aug 2027.',
          en: 'First paying customer — commercial launch Aug 2027.',
        },
      },
      {
        label: 'M21–22',
        desc: {
          sv: 'Operativ break-even. Kapitalet räcker hela vägen.',
          en: 'Operating break-even. Capital lasts all the way.',
        },
      },
      {
        label: '100 MSEK',
        desc: {
          sv: 'ARR år 5 — 200 000 elever i Norden.',
          en: 'ARR in year 5 — 200,000 students in the Nordics.',
        },
      },
    ],
    source: {
      sv: 'ARR-prognosen är Elevantes estimat — bygger på 500 SEK/elev/år och elevtal från Skolverket/Eurostat (ISCED 3); pilotår 1 kostnadsfritt.',
      en: 'The ARR forecast is Elevante’s estimate — based on 500 SEK/student/year and student counts from Skolverket/Eurostat (ISCED 3); pilot year 1 free of charge.',
    },
  },

  // ── §14 Traction (slide14_traction) ──────────────────────────────
  traction: {
    eyebrow: {
      sv: 'Traction',
      en: 'Traction',
    },
    title: {
      sv: 'Produkt byggd. Pilot på väg in.',
      en: 'Product built. Pilot coming in.',
    },
    source: {
      sv: 'Status per juni 2026 (Elevante). 18 månader i utveckling. LOI undertecknad med Amerikanska Gymnasiet (5 skolor, ~2 000 elever); Nacka gymnasium i dialog; Berget-villkor under förhandling.',
      en: 'Status as of June 2026 (Elevante). 18 months in development. LOI signed with Amerikanska Gymnasiet (5 schools, ~2,000 students); Nacka Gymnasium in dialogue; Berget terms under negotiation.',
    },
  },

  // ── §15 Positioning (slide15_positioning) ────────────────────────
  positioning: {
    eyebrow: {
      sv: 'Positionering',
      en: 'Positioning',
    },
    title: {
      sv: 'Inte ett läromedel. Inte en chatbot. En egen kategori.',
      en: 'Not a textbook. Not a chatbot. A category of its own.',
    },
    rows: [
      {
        category: { sv: 'Konsument-AI', en: 'Consumer AI' },
        examples: 'ChatGPT, Copilot, Gemini',
        desc: { sv: 'Hittar på fakta. Ingen läroplanskoppling.', en: 'Invents facts. No curriculum link.' },
        isElevante: false,
      },
      {
        category: { sv: 'Skolplattformar', en: 'School platforms' },
        examples: 'SchoolSoft, Canvas, Classroom',
        desc: { sv: 'Etablerade — men admin-verktyg med svag AI.', en: 'Established — but admin tools with weak AI.' },
        isElevante: false,
      },
      {
        category: { sv: 'B2C-recorders', en: 'B2C recorders' },
        examples: 'Verba',
        desc: { sv: 'Utan skolan. Apple-only. Generisk transkribering.', en: 'Without the school. Apple-only. Generic transcription.' },
        isElevante: false,
      },
      {
        category: { sv: 'Läxhjälps-AI', en: 'Homework-help AI' },
        examples: 'Kompis, Albert',
        desc: { sv: 'Begränsade till läxhjälp.', en: 'Limited to homework help.' },
        isElevante: false,
      },
      {
        category: { sv: 'Elevante', en: 'Elevante' },
        examples: '',
        desc: {
          sv: 'Strikt RAG på lärarens lektion · svensk precision · EU-suveränitet · skolan som avtalspart.',
          en: 'Strict RAG on the teacher’s lesson · Swedish precision · EU sovereignty · the school as contracting party.',
        },
        isElevante: true,
      },
    ],
    source: {
      sv: 'Konkurrentbedömning per juni 2026 (Elevante), baserad på offentliga produktuppgifter. Kategoriseringen är vår egen positionering.',
      en: 'Competitor assessment as of June 2026 (Elevante), based on public product information. The categorisation is our own positioning.',
    },
  },

  // ── §16 Team (slide16_team) ───────────────────────────────────────
  team: {
    eyebrow: {
      sv: 'Team',
      en: 'Team',
    },
    title: {
      sv: 'Byggare och kommersialiserare',
      en: 'Builders and commercializers',
    },
    people: [
      {
        name: 'John Guthed',
        initials: 'JG',
        role: { sv: 'Grundare · Produkt & teknik', en: 'Founder · Product & tech' },
        bio: {
          sv: '20+ år inom digital och mobil produktutveckling. Byggde hela Elevante-plattformen själv med AI-assisterad utveckling. VD för Availsthlm.',
          en: '20+ years in digital and mobile product development. Built the entire Elevante platform himself with AI-assisted development. CEO of Availsthlm.',
        },
      },
      {
        name: 'Stefan Pettersson Noord',
        initials: 'SP',
        role: { sv: 'Medgrundare · Affär & go-to-market', en: 'Co-founder · Business & go-to-market' },
        bio: {
          sv: 'Tre decennier inom digital affär och varumärke. Ex-VD Ogilvy Interactive Sweden, delägare i Amanda AI. Äger skol- och myndighetsrelationerna.',
          en: 'Three decades in digital business and brand. Ex-CEO Ogilvy Interactive Sweden, co-owner of Amanda AI. Owns the school and authority relationships.',
        },
      },
    ],
    backedBy: {
      label: { sv: 'Kompletteras av ', en: 'Backed by ' },
      body: {
        sv: 'en CTO som rekryteras vid lansering, en produktdesigner och en customer-success-roll från år 2 — plus Avanti Studios som röst-/avatar-teknikpartner.',
        en: 'a CTO recruited at launch, a product designer and a customer-success role from year 2 — plus Avanti Studios as voice/avatar technology partner.',
      },
    },
  },

  // ── §17 Invest case (slide17_investcase) ─────────────────────────
  investcase: {
    eyebrow: {
      sv: 'Investeringscaset',
      en: 'The investment case',
    },
    title: {
      sv: 'Varför detta är en stark affär',
      en: 'Why this is a strong deal',
    },
    items: [
      {
        title: { sv: 'Kapital-effektivt', en: 'Capital-efficient' },
        desc: {
          sv: '14 MSEK till break-even månad 22. Kassan återställd till ~20 MSEK månad 36 — utan ny finansiering.',
          en: '14 MSEK to break-even in month 22. Cash restored to ~20 MSEK by month 36 — with no new financing.',
        },
      },
      {
        title: { sv: 'Topp-enhetsekonomi', en: 'Top-tier unit economics' },
        desc: {
          sv: '125× LTV/CAC och payback under en månad, mot ett branschsnitt på 6–18 månader.',
          en: '125× LTV/CAC and payback under one month, against a 6–18 month industry benchmark.',
        },
      },
      {
        title: { sv: 'Marginal som skalar', en: 'Margin that scales' },
        desc: {
          sv: '~68 % bruttomarginal i pilot, mot ~64 % EBITDA år 5. AI-kostnaden är försumbar.',
          en: '~68% gross margin in pilot, toward ~64% EBITDA by year 5. AI cost is negligible.',
        },
      },
      {
        title: { sv: 'Stor marknad', en: 'Large market' },
        desc: {
          sv: '316 554 gymnasieelever i Sverige; 18,3 milj. i EU27 — plus vuxen- och yrkesutbildning.',
          en: '316,554 upper-secondary students in Sweden; 18.3M in EU27 — plus adult and vocational education.',
        },
      },
      {
        title: { sv: 'Timing som stänger', en: 'Timing closing fast' },
        desc: {
          sv: 'Eleverna har tagit AI; skolan inte. Varje månad cementerar konsument-AI som standard.',
          en: 'Students adopted AI; schools haven’t. Every month cements consumer AI as the default.',
        },
      },
      {
        title: { sv: 'Trovärdig exit', en: 'Credible exit' },
        desc: {
          sv: 'EdTech handlas på 5–8× ARR — ungefär 500–800 MSEK vid 100 MSEK ARR år 5.',
          en: 'EdTech trades at 5–8× ARR — roughly 500–800 MSEK at 100 MSEK ARR in year 5.',
        },
      },
    ],
    source: {
      sv: 'Marknadssiffror: Skolverket + Eurostat 2023. Break-even, EBITDA och enhetsekonomi är Elevantes egna estimat. Exit-multiplar (5–8× ARR) är observerade EdTech-transaktioner — inget utlovat utfall.',
      en: 'Market figures: Skolverket + Eurostat 2023. Break-even, EBITDA and unit economics are Elevante’s own estimates. Exit multiples (5–8× ARR) are observed EdTech transactions — not a promised outcome.',
    },
  },

  // ── §17b De-risking (slide17b_derisk) ────────────────────────────
  derisk: {
    eyebrow: {
      sv: 'Riskbilden',
      en: 'The risk picture',
    },
    title: {
      sv: 'Det som brukar oroa — redan avbockat',
      en: 'What usually worries investors — already handled',
    },
    lede: {
      sv: 'Tre frågor en investerare ställer innan checken. Här är svaren — inte löften, utan saker som redan är på plats.',
      en: 'Three questions an investor asks before the cheque. Here are the answers — not promises, but things already in place.',
    },
    cards: [
      {
        worry: { sv: 'Beroende av en ung leverantör?', en: 'Reliant on a young vendor?' },
        heading: { sv: 'Samma svenska AI-moln som Riksbanken', en: 'The same Swedish AI cloud as the Riksbank' },
        body: {
          sv:
            'Elevante kör på Berget AI — svenskägd, suverän infrastruktur där all data och beräkning sker fysiskt i Sverige, immunt mot US Cloud Act. ' +
            'Riksbanken är flaggskeppskund och 300+ organisationer kör redan på plattformen. Och skulle något hända: transkriberingsmotorn KB-Whisper är öppen källkod och flyttbar till annan EU-infrastruktur.',
          en:
            'Elevante runs on Berget AI — Swedish-owned, sovereign infrastructure where all data and compute sit physically in Sweden, immune to the US Cloud Act. ' +
            'The Riksbank (Sweden’s central bank) is a flagship customer and 300+ organisations already run on the platform. And if anything happened: the KB-Whisper transcription engine is open source and portable to other EU infrastructure.',
        },
      },
      {
        worry: { sv: 'EU AI Act då?', en: 'What about the EU AI Act?' },
        heading: { sv: 'Byggd under högriskgränsen — med flit', en: 'Built below the high-risk line — on purpose' },
        body: {
          sv:
            'Strikt RAG svarar på lektionens innehåll — betygsätter inte och styr inte lärande, och hamnar därmed i AI-aktens ”begränsad risk”, inte högrisk (Annex III). ' +
            'Ingen känsloigenkänning (förbjudet i klassrum sedan 2025). Konkurrenter med adaptiva prov och progress-tracking bär compliance-bördan från aug 2026 — den har vi designat bort. Skärps klassningen ändå finns conformity-budget i V2.',
          en:
            'Strict RAG answers the lesson’s content — it doesn’t grade or steer learning, which places it in the AI Act’s “limited risk”, not high risk (Annex III). ' +
            'No emotion recognition (banned in classrooms since 2025). Competitors with adaptive tests and progress tracking carry the compliance burden from Aug 2026 — we’ve designed it out. Should the classification still tighten, conformity budget sits in V2.',
        },
      },
      {
        worry: { sv: 'Ännu en EdTech som lovar guld?', en: 'Another EdTech promising the moon?' },
        heading: { sv: 'Vi lovar inte utfall vi inte mätt', en: 'We don’t promise outcomes we haven’t measured' },
        body: {
          sv:
            'Forskningen på digitala verktyg i skolan är ärligt talat tunn — de flesta EdTech-pitcher blundar för det. Vi gör tvärtom: piloten är designad för att mäta effekt innan vi säljer på resultat. ' +
            'Det är så man bygger något skolor litar på — och en egen evidensbas som ingen konkurrent har.',
          en:
            'Research on digital tools in schools is, honestly, thin — most EdTech pitches look past it. We do the opposite: the pilot is built to measure effect before we sell on results. ' +
            'That’s how you build something schools trust — and an evidence base no competitor has.',
        },
      },
    ],
    scaleNote: {
      sv: 'Elevante ligger på begränsad risk — långt från högriskkraven konkurrenterna måste klara.',
      en: 'Elevante sits at limited risk — far from the high-risk requirements competitors must meet.',
    },
    source: {
      sv:
        'Berget AI (berget.ai): Riksbanken som flaggskeppskund, 300+ kunder, seed 2,1 M€ jan 2026 (Luminar Ventures m.fl.). ' +
        'EU AI Act (förordning 2024/1689), Annex III — Elevantes klassning är designintention och prövas mot regelverket; conformity-assessment budgeterad i V2. Evidensläge: IFAU, forskningsöversikt om digitala verktyg i skolan.',
      en:
        'Berget AI (berget.ai): the Riksbank as flagship customer, 300+ customers, €2.1M seed Jan 2026 (Luminar Ventures et al.). ' +
        'EU AI Act (Regulation 2024/1689), Annex III — Elevante’s classification is design intent, assessed against the regulation; conformity assessment budgeted in V2. Evidence base: IFAU research review on digital tools in schools.',
    },
  },

  // ── §19 Ask (slide19_ask) ─────────────────────────────────────────
  ask: {
    eyebrow: {
      // "The ask" is the eyebrow in the source — used verbatim in both langs
      sv: 'The ask',
      en: 'The ask',
    },
    title: {
      part1: { sv: 'Vi reser 14 MSEK ', en: 'We’re raising 14 MSEK ' },
      accent: 'pre-seed',
    },
    lede: {
      sv: 'En pre-seed-runda på 14 MSEK (€1,25M) för 24–30 månaders runway — räcker till operativ break-even utan ny finansiering.',
      en: 'A pre-seed round of 14 MSEK (€1.25M) for 24–30 months of runway — enough to reach operating break-even without new financing.',
    },
    investorWish: {
      sv: 'Vad vi vill av en investerare: en operativ partner med räckvidd in i skola och utbildning — inte en passiv check.',
      en: 'What we want from an investor: an operational partner with reach into schools and education — not a passive cheque.',
    },
    plus: {
      label: { sv: 'Plus: ', en: 'Plus: ' },
      body: {
        sv: 'Vinnova-bidrag (icke-utspädande) + tillväxtomgång 20–25 MSEK år 2–3 för nordisk expansion.',
        en: 'Vinnova grants (non-dilutive) + a growth round of 20–25 MSEK in years 2–3 for Nordic expansion.',
      },
    },
    fundsTitle: { sv: 'Så används kapitalet', en: 'How the capital is used' },
    fundsTotal: { sv: '14,0 MSEK', en: '14.0 MSEK' },
    fundsSource: {
      sv: 'Planerad fördelning av kapitalet (14,0 MSEK, 24–30 mån runway till operativ break-even). Icke-utspädande utöver detta: Vinnova 0,5–1,5 MSEK, FoU-avdrag ~0,23 MSEK, EU InvestAI år 2–3.',
      en: 'Planned allocation of the capital (14.0 MSEK, 24–30 mo runway to operating break-even). Non-dilutive on top: Vinnova 0.5–1.5 MSEK, R&D tax credit ~0.23 MSEK, EU InvestAI in years 2–3.',
    },
    contact: 'John Guthed  ·  john@elevante.se  ·  +46 733 383 420  ·  elevante.se',
  },

  // ── §20 Sources (slide20_sources) ────────────────────────────────
  sources: {
    eyebrow: {
      sv: 'Appendix',
      en: 'Appendix',
    },
    title: {
      sv: 'Källor & underlag',
      en: 'Sources & basis',
    },
    lines: [
      {
        claim: {
          sv: '8 av 10 lärare (orimlig arbetsbelastning)',
          en: '8 in 10 teachers (unreasonable workload)',
        },
        citation: 'Sveriges Lärare, "Med orimliga förutsättningar" (2024)',
      },
      {
        claim: {
          sv: '2 av 3 (67 %) saknar förutsättningar',
          en: '2 in 3 (67%) lack the conditions',
        },
        citation: 'Skolverket, Attityder till skolan 2024, delrapport 3 (2025)',
      },
      {
        claim: {
          sv: 'Hälften kan koncentrera sig på lektionerna',
          en: 'Half can concentrate during lessons',
        },
        citation: 'Skolverket, Attityder till skolan 2024',
      },
      {
        claim: {
          sv: '10 600 lärare saknas 2038',
          en: '10,600 teachers missing by 2038',
        },
        citation: 'Skolverket, Lärarprognos 2024',
      },
      {
        claim: {
          sv: '9 av 10 lärare gör annat än undervisning · 1 av 5 vill lämna yrket',
          en: '9 in 10 teachers do non-teaching work · 1 in 5 want to leave',
        },
        citation: 'Sveriges Lärare, "Med orimliga förutsättningar" (2024)',
      },
      {
        claim: {
          sv: '3 av 4 lärare stressade · 1 av 2 gymnasie-/högstadieelever stressade',
          en: '3 in 4 teachers stressed · 1 in 2 secondary students stressed',
        },
        citation: 'Skolverket, Attityder till skolan 2024, delrapport 1',
      },
      {
        claim: {
          sv: '70 % / 33 % AI-användning bland unga',
          en: '70% / 33% AI use among youth',
        },
        citation: 'Internetstiftelsen, Svenskarna och internet 2024',
      },
      {
        claim: {
          sv: '78 % av lärarna saknar AI-kunskap',
          en: '78% of teachers lack AI knowledge',
        },
        citation: 'OECD, TALIS 2024 (Sverige)',
      },
      {
        claim: {
          sv: 'KB-Whisper 47 % färre fel',
          en: 'KB-Whisper 47% fewer errors',
        },
        citation: 'KBLab, Kungliga biblioteket',
      },
      {
        claim: {
          sv: 'Marknadssiffror (elevantal)',
          en: 'Market figures (student counts)',
        },
        citation: 'Skolverkets gymnasieregister 2024 + Eurostat 2023 (ISCED 3)',
      },
    ],
    footer: {
      perStudentFunding: {
        label: { sv: 'Per-elev-finansiering: ', en: 'Per-student funding: ' },
        body: {
          sv: 'OECD, Education at a Glance 2024 + Skolverkets kostnadsstatistik 2024. ',
          en: 'OECD, Education at a Glance 2024 + Skolverket cost statistics 2024. ',
        },
      },
      forecasts: {
        label: { sv: 'Prognoser ', en: 'Forecasts ' },
        body: {
          sv: '(bruttomarginal, LTV/CAC, ARR) är Elevantes egna estimat med externa indata (elevtal, pris). Traction- och produktuppgifter per juni 2026. ',
          en: '(gross margin, LTV/CAC, ARR) are Elevante’s own estimates with external inputs (student counts, price). Traction and product details as of June 2026. ',
        },
      },
      datasovereignty: {
        label: { sv: 'EU-datasuveränitet', en: 'EU data sovereignty' },
        body: {
          sv: ' avser EU-datalagring och EU-suverän transkribering (Berget AI); generering (Claude) och drift körs hos leverantörer under DPA/SCC — inte full Cloud Act-immunitet.',
          en: ' means EU data storage and EU-sovereign transcription (Berget AI); generation (Claude) and ops run with vendors under DPA/SCC — not full Cloud Act immunity.',
        },
      },
    },
  },
};

// ── Media alt-texts, captions and UI labels (previously hardcoded) ──
export const MEDIA = {
  heroScroll:   { sv: 'Scrolla ↓', en: 'Scroll ↓' },
  chatAlt:      { sv: 'Elevante-chatt med svar och källhänvisningar ur lektionen', en: 'Elevante chat with answers and source citations from the lesson' },
  chatCaption:  { sv: 'Fråga Elevante · svar med källor', en: 'Ask Elevante · answers with sources' },
  elevAlt:      { sv: 'Elevens vy i Elevante med dagens lektioner', en: "Student view in Elevante with today's lessons" },
  elevCaption:  { sv: 'Elevens vy · dagens lektioner', en: "Student view · today's lessons" },
  kartaAlt:     { sv: 'Förståelsekarta i Elevante per klass och begrepp', en: 'Understanding map in Elevante per class and concept' },
  kartaCaption: { sv: 'Lärarens förståelsekarta · per klass', en: "Teacher's understanding map · per class" },
  kartaLiveChrome: { sv: 'Elevante · Lärarvy', en: 'Elevante · Teacher view' },
  kartaLiveBadge:  { sv: 'Live-demo', en: 'Live demo' },
  kartaLiveNote:   { sv: 'Den riktiga produktvyn — inte en bild. Klicka på en elev eller ett koncept. Syntetisk demodata, ingen riktig elevdata.', en: 'The actual product view — not an image. Click a student or a concept. Synthetic demo data, no real student data.' },
  arrAriaLabel: { sv: 'ARR-prognos 2026–2031, från 0 till 100 MSEK.', en: 'ARR forecast 2026–2031, from 0 to 100 MSEK.' },
  networkAriaLabel: { sv: 'Nätverksgraf: varje ny lektion och skola stärker kopplingarna i Elevantes datamodell.', en: 'Network graph: every new lesson and school strengthens the connections in Elevante’s data model.' },
  marketAriaLabel: { sv: 'Koncentriska ringar: marknaden växer från Sverige till Norden till EU.', en: 'Concentric rings: the market grows from Sweden to the Nordics to the EU.' },
  riskLadderAriaLabel: { sv: 'EU AI Act-riskstege i fyra nivåer: minimal, begränsad (där Elevante ligger), hög och oacceptabel risk.', en: 'EU AI Act risk ladder in four levels: minimal, limited (where Elevante sits), high and unacceptable risk.' },
  fundsAriaLabel: { sv: 'Stapel över kapitalanvändning: personal 39 %, buffert 22 %, marknad 18 %, produkt 9 %, övrigt 12 %.', en: 'Use-of-funds bar: team 39%, buffer 22%, marketing 18%, product 9%, other 12%.' },
  curveCategory: { sv: 'Kategori', en: 'Category' },
} satisfies Record<string, L>;

// ── Kontaktpersoner (visas i den fästa kontaktraden + i avslutet) ──
// `phone` är lokaliserad: svenskt format på sv, internationellt på en.
// `tel` är alltid internationellt (för tel:-länken).
export type Contact = { name: string; email: string; tel: string; phone: L };
export const CONTACTS: Contact[] = [
  {
    name: 'John Guthed',
    email: 'john@elevante.se',
    tel: '+46733383420',
    phone: { sv: '0733 383420', en: '+46 733 383 420' },
  },
  {
    name: 'Stefan Pettersson Noord',
    email: 'stefan@elevante.se',
    tel: '+46708526604',
    phone: { sv: '0708 526604', en: '+46 708 526 604' },
  },
];
