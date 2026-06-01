'use client';

import { useState } from 'react';
import type { BlogCardData } from '@/lib/blog';
import { BlogCard } from './BlogCard';

type Props = {
  posts: BlogCardData[];
  categories: string[];
  base: string;
  allLabel: string;
};

// Kategori-filter + kortgrid. Filtrerar de redan renderade korten på klienten —
// inga nätverksanrop, ingen brödtext i bundeln (posts är lättviktiga kort).
export function BlogIndex({ posts, categories, base, allLabel }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const filtered = active ? posts.filter((p) => p.category === active) : posts;
  const chips: Array<string | null> = [null, ...categories];

  return (
    <>
      {categories.length > 1 ? (
        <div className="mb-10 flex flex-wrap gap-2">
          {chips.map((category) => {
            const isActive = category === active;
            return (
              <button
                key={category ?? '__all'}
                type="button"
                onClick={() => setActive(category)}
                aria-pressed={isActive}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-canvas)]'
                    : 'border-[var(--color-sand)] text-[var(--color-ink-secondary)] hover:border-[var(--color-ink-muted)]'
                }`}
              >
                {category ?? allLabel}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((post) => (
          <BlogCard key={post.slug} post={post} base={base} />
        ))}
      </div>
    </>
  );
}
