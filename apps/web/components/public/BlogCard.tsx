import Link from 'next/link';
import Image from 'next/image';
import type { BlogCardData } from '@/lib/blog';
import { formatSvDate } from '@/lib/format';

// type-only import ovan → ingen node:fs-kod dras in i klientbundeln.

export function BlogCard({ post, base }: { post: BlogCardData; base: string }) {
  return (
    <Link
      href={`${base}/blogg/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-[20px] border border-[var(--color-sand)] bg-[var(--color-surface)] transition-colors hover:border-[var(--color-ink-muted)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--color-surface-soft)]">
        {post.heroImage ? (
          <Image
            src={post.heroImage}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--color-surface-soft)] to-[var(--color-sand)]">
            <span className="font-serif text-[1.5rem] text-[var(--color-ink-muted)]">
              Elevante
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center gap-3 text-xs text-[var(--color-ink-muted)]">
          <span className="rounded-full bg-[var(--color-surface-soft)] px-2.5 py-1 font-medium uppercase tracking-[0.08em]">
            {post.category}
          </span>
          <span>{post.readingMinutes} min</span>
        </div>
        <h3 className="font-serif text-[1.25rem] leading-snug text-[var(--color-ink)]">
          {post.title}
        </h3>
        <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {post.description}
        </p>
        <time
          dateTime={post.date}
          className="mt-4 text-xs text-[var(--color-ink-muted)]"
        >
          {formatSvDate(post.date)}
        </time>
      </div>
    </Link>
  );
}
