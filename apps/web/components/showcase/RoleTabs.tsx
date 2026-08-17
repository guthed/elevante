'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export type RoleTab = {
  id: string;
  label: string;
  panel: ReactNode;
};

// Presentational tab-switcher — no data fetching, no animation, no external
// state. IMPORTANT: switching tabs must stay a plain visibility toggle (the
// `hidden` attribute), not a transform/opacity transition and not an
// unmount/remount — InsightHeatmap's fixed-position drawer panels break
// inside any ancestor with `will-change: transform` (see the warning
// comment above its usage in InvestorDeck.tsx §6), and remounting on every
// switch would silently discard the student chat's in-progress conversation.
export default function RoleTabs({
  tabs,
  defaultId,
  ariaLabel,
}: {
  tabs: RoleTab[];
  defaultId?: string;
  ariaLabel?: string;
}) {
  const instanceId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(defaultId ?? tabs[0]?.id);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === active),
  );
  const activeTab = tabs[activeIndex] ?? tabs[0];

  function selectByIndex(index: number, focusButton: boolean) {
    const wrapped = (index + tabs.length) % tabs.length;
    setActive(tabs[wrapped].id);
    if (focusButton) {
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[wrapped]?.focus();
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectByIndex(activeIndex + 1, true);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectByIndex(activeIndex - 1, true);
    } else if (e.key === 'Home') {
      e.preventDefault();
      selectByIndex(0, true);
    } else if (e.key === 'End') {
      e.preventDefault();
      selectByIndex(tabs.length - 1, true);
    }
  }

  return (
    <div>
      <div ref={listRef} role="tablist" aria-label={ariaLabel} className="flex gap-2" onKeyDown={onKeyDown}>
        {tabs.map((tab, i) => {
          const isActive = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${instanceId}-role-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${instanceId}-role-tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => selectByIndex(i, false)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-ink text-canvas' : 'bg-surface text-ink-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${instanceId}-role-tabpanel-${tab.id}`}
          aria-labelledby={`${instanceId}-role-tab-${tab.id}`}
          hidden={tab.id !== activeTab.id}
          className="mt-6"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
