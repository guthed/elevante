'use client';

import { useInView } from '@/lib/hooks/useInView';

export default function Eyebrow({
  children,
  center = false,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  const [ref, inView] = useInView<HTMLParagraphElement>();
  return (
    <p
      ref={ref}
      className={`eyebrow flex items-center gap-3 ${center ? 'justify-center' : ''}`}
    >
      <span
        aria-hidden
        className="inline-block h-px bg-coral transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ width: inView ? '2.25rem' : '0rem' }}
      />
      {children}
    </p>
  );
}
