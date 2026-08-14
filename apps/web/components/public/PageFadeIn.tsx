'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

// <main> tonar in vid varje sidbyte för att ge känsla av rörelse mellan
// sidor. Men på den allra första målningen (hård navigering/laddning)
// finns ingen "föregående sida" att tona in ifrån, och de 280ms
// animationen kostar då bara tid av Largest Contentful Paint — så vi
// väntar med att sätta animationsklassen tills den första klientsid-
// navigeringen faktiskt sker (hasNavigated, satt under rendering).
//
// key={pathname} tvingar fram en riktig remount av <main> vid varje
// sidbyte: en helt ny DOM-nod som redan har animationsklassen från start
// spelar alltid upp CSS-animationen, till skillnad från att bara växla
// en className-sträng på en befintlig nod (som bara triggar en gång —
// webbläsaren har inget att reagera på om klassvärdet är identiskt med
// föregående rendering).
export function PageFadeIn({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [hasNavigated, setHasNavigated] = useState(false);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setHasNavigated(true);
  }

  return (
    <main
      key={pathname}
      id="main-content"
      className={hasNavigated ? 'flex-1 animate-page-in' : 'flex-1'}
    >
      {children}
    </main>
  );
}
