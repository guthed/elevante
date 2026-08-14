'use client';

import { useState, type KeyboardEvent, type ReactNode } from 'react';

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
  const [active, setActive] = useState(defaultId ?? tabs[0]?.id);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === active),
  );
  const activeTab = tabs[activeIndex] ?? tabs[0];

  function selectByIndex(index: number) {
    const wrapped = (index + tabs.length) % tabs.length;
    setActive(tabs[wrapped].id);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectByIndex(activeIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectByIndex(activeIndex - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      selectByIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      selectByIndex(tabs.length - 1);
    }
  }

  return (
    <div>
      <div role="tablist" className="flex gap-2" onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`role-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`role-tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(tab.id)}
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
        id={`role-tabpanel-${activeTab.id}`}
        aria-labelledby={`role-tab-${activeTab.id}`}
        className="mt-6"
      >
        {activeTab.panel}
      </div>
    </div>
  );
}
