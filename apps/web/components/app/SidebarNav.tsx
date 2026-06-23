'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = { href: string; label: string; description: string };

type Props = {
  items: NavItem[];
  overviewHref: string;
};

export function SidebarNav({ items, overviewHref }: Props) {
  const pathname = usePathname();

  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const isOverview = item.href === overviewHref;
        const isActive = isOverview
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'block rounded-[12px] px-4 py-2.5 transition-colors',
                isActive
                  ? 'bg-[var(--color-sand)]/45'
                  : 'hover:bg-[var(--color-surface-soft)]',
              ].join(' ')}
            >
              <span
                className={[
                  'block text-[0.9375rem]',
                  isActive
                    ? 'text-[var(--color-ink)]'
                    : 'text-[var(--color-ink-secondary)]',
                ].join(' ')}
              >
                {item.label}
              </span>
              <span className="mt-0.5 block text-[0.75rem] leading-snug text-[var(--color-ink-muted)]">
                {item.description}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
