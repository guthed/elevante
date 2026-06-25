'use client';

import { useInView } from '@/lib/hooks/useInView';
import { useCountUp } from '@/lib/hooks/useCountUp';

type Props = {
  /** Talet att räkna till. */
  value: number;
  /** Formatterar det aktuella (decimal) värdet till sträng. Default: avrundat heltal. */
  format?: (n: number) => string;
  suffix?: string;
  prefix?: string;
  className?: string;
  durationMs?: number;
};

export default function CountUp({
  value,
  format = (n) => Math.round(n).toLocaleString('sv-SE'),
  suffix = '',
  prefix = '',
  className,
  durationMs,
}: Props) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const current = useCountUp(value, inView, durationMs);
  return (
    <span ref={ref} className={className}>
      {prefix}
      {format(current)}
      {suffix}
    </span>
  );
}
