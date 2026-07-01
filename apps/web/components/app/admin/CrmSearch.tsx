'use client';
import { useState, useTransition } from 'react';
import { searchSchoolUnitsAction, syncSchoolUnitAction } from '@/app/actions/crm';
import type { SchoolUnit } from '@/lib/skolverket';

type Dict = { searchLabel: string; searchPlaceholder: string; sync: string };

export function CrmSearch({ dict }: { dict: Dict }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SchoolUnit[]>([]);
  const [synced, setSynced] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function onSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      setResults(await searchSchoolUnitsAction({ query: value }));
    });
  }

  function onSync(u: SchoolUnit) {
    startTransition(async () => {
      const r = await syncSchoolUnitAction({ code: u.code, name: u.name, skolform: u.skolform });
      if (r.status === 'ok') setSynced((s) => new Set(s).add(u.code));
    });
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2" htmlFor="crm-q">
        {dict.searchLabel}
      </label>
      <input
        id="crm-q"
        value={query}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={dict.searchPlaceholder}
        className="w-full rounded-lg border border-ink/15 bg-canvas px-4 py-2.5"
      />
      <ul className="mt-4 divide-y divide-ink/10">
        {results.map((u) => (
          <li key={u.code} className="flex items-center justify-between gap-4 py-3">
            <span>
              <span className="font-medium">{u.name}</span>
              <span className="block text-sm text-ink/60">
                {u.kommun} · {u.skolform.join(', ')}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onSync(u)}
              disabled={pending || synced.has(u.code)}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {synced.has(u.code) ? '✓' : dict.sync}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
