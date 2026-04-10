import type { ReactNode } from 'react';

type Width = 'prose' | 'content' | 'wide';

type Props = {
  as?: 'div' | 'section' | 'header' | 'footer' | 'main' | 'article';
  width?: Width;
  className?: string;
  children: ReactNode;
};

const widthClass: Record<Width, string> = {
  prose: 'container-prose',
  content: 'container-content',
  wide: 'container-wide',
};

export function Container({
  as: Tag = 'div',
  width = 'content',
  className = '',
  children,
}: Props) {
  return <Tag className={`${widthClass[width]} ${className}`.trim()}>{children}</Tag>;
}

type SectionProps = {
  id?: string;
  className?: string;
  background?: 'white' | 'subtle' | 'primary';
  children: ReactNode;
};

const bgClass: Record<NonNullable<SectionProps['background']>, string> = {
  white: 'bg-[var(--color-bg)]',
  subtle: 'bg-[var(--color-bg-subtle)]',
  primary: 'bg-[var(--color-primary)] text-white',
};

export function Section({
  id,
  className = '',
  background = 'white',
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      className={`py-20 md:py-28 ${bgClass[background]} ${className}`.trim()}
    >
      {children}
    </section>
  );
}
