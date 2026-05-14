'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = { href: string; label: string };

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
                'block rounded-[12px] px-4 py-2.5 text-[0.9375rem] transition-colors',
                isActive
                  ? 'bg-[var(--color-sand)]/45 text-[var(--color-ink)]'
                  : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]',
              ].join(' ')}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
