'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export type RoleTab = {
  id: string;
  label: string;
  panel: ReactNode;
};

// Presentational tab-switcher — no data fetching, no animation, no external
// state. IMPORTANT: switching tabs must stay a plain conditional render, not
// a transform/opacity transition — InsightHeatmap's fixed-position drawer
// panels break inside any ancestor with `will-change: transform` (see the
// warning comment above its usage in InvestorDeck.tsx §6).
export default function RoleTabs({ tabs, defaultId }: { tabs: RoleTab[]; defaultId?: string }) {
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
      <div ref={listRef} role="tablist" className="flex gap-2" onKeyDown={onKeyDown}>
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
      <div
        key={activeTab.id}
        role="tabpanel"
        id={`${instanceId}-role-tabpanel-${activeTab.id}`}
        aria-labelledby={`${instanceId}-role-tab-${activeTab.id}`}
        className="mt-6"
      >
        {activeTab.panel}
      </div>
    </div>
  );
}
