'use client';

import { useState } from 'react';
import StackedCurve from './StackedCurve';
import { ARR, CALC, MEDIA, t, type Lang } from '@/app/investerare/content';

// ARR per år vid basläget (500 kr × ramp till 200 000 elever år 5), i MSEK.
const BASE = [0, 8, 20, 50, 100];
const BASE_PRICE = 500;
const BASE_REACH = 200000;
const Y_MAX = 150; // fast y-axel så kurvan synligt stiger/sjunker

export default function ArrCalculator({ lang }: { lang: Lang }) {
  const [price, setPrice] = useState(BASE_PRICE);
  const [reach, setReach] = useState(BASE_REACH);

  const factor = (price / BASE_PRICE) * (reach / BASE_REACH);
  const values = BASE.map((v) => Math.round(v * factor * 10) / 10);
  const year5 = Math.round(values[values.length - 1]);
  const locale = lang === 'sv' ? 'sv-SE' : 'en-US';

  return (
    <div>
      <StackedCurve
        categories={ARR.categories}
        unit={ARR.unit}
        series={[{ label: 'ARR', color: 'rgba(255,122,107,0.22)', values }]}
        ariaLabel={t(lang, MEDIA.arrAriaLabel)}
        categoryLabel={t(lang, MEDIA.curveCategory)}
        maxOverride={Y_MAX}
        displayTotal={String(year5)}
      />

      <div className="mt-6 flex flex-col gap-5">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-muted">{t(lang, CALC.priceLabel)}</span>
            <span className="font-serif text-lg text-ink tabular-nums">{price} SEK</span>
          </div>
          <input
            type="range"
            min={300}
            max={650}
            step={50}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            aria-label={t(lang, CALC.priceLabel)}
            className="mt-2 w-full cursor-pointer"
            style={{ accentColor: 'var(--color-coral)' }}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-muted">{t(lang, CALC.reachLabel)}</span>
            <span className="font-serif text-lg text-ink tabular-nums">{reach.toLocaleString(locale)}</span>
          </div>
          <input
            type="range"
            min={100000}
            max={230000}
            step={10000}
            value={reach}
            onChange={(e) => setReach(Number(e.target.value))}
            aria-label={t(lang, CALC.reachLabel)}
            className="mt-2 w-full cursor-pointer"
            style={{ accentColor: 'var(--color-coral)' }}
          />
        </div>
      </div>

      <p className="mt-4 text-sm text-ink-muted">{t(lang, CALC.note)}</p>
    </div>
  );
}
