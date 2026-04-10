/** Slå ihop klassnamn, filtrera falsy-värden. Mycket enklare än clsx för våra behov. */
export function cn(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}
