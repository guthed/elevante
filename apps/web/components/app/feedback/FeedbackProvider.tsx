'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Locale } from '@/lib/i18n/config';
import type { FeedbackItemContext } from '@/lib/feedback/context';
import { FeedbackSheet } from './FeedbackSheet';

type FeedbackApi = {
  /** Öppnar bladet. Valfritt item skriver över det som vyn registrerat. */
  open: (item?: FeedbackItemContext | null) => void;
  /** Registrerar vad eleven tittar på just nu (kort, fråga, lektion). */
  setItem: (item: FeedbackItemContext | null) => void;
};

const FeedbackContext = createContext<FeedbackApi | null>(null);

/**
 * Ett enda blad för hela appen — knappen finns på flera ställen (topbar,
 * sidomeny, inne i träningsvyerna) men får aldrig rendera var sin dialog.
 *
 * Det som eleven tittar på (kortet, frågan, lektionen) hålls i en ref, inte i
 * state: vyerna registrerar det på varje kortbyte, och en state-uppdatering
 * där skulle rendera om hela app-skalet flera gånger per session utan att
 * någonting på skärmen ändras. Värdet läses först när bladet faktiskt öppnas,
 * och kopieras då in i state så att bladets innehåll är stabilt medan det är
 * öppet — även om eleven hinner byta kort bakom det.
 */
export function FeedbackProvider({
  locale,
  role,
  children,
}: {
  locale: Locale;
  role: string;
  children: ReactNode;
}) {
  const itemRef = useRef<FeedbackItemContext | null>(null);
  const [openItem, setOpenItem] = useState<FeedbackItemContext | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // Räknare, inte bara en boolean: den används som `key` på bladet så att
  // varje öppning monterar en färsk komponent med tomt formulär. Alternativet
  // — att nollställa state i bladets öppna-effekt — är en kaskadrender.
  const [openCount, setOpenCount] = useState(0);

  const setItem = useCallback((item: FeedbackItemContext | null) => {
    itemRef.current = item;
  }, []);

  const open = useCallback((item?: FeedbackItemContext | null) => {
    setOpenItem(item ?? itemRef.current);
    setOpenCount((n) => n + 1);
    setIsOpen(true);
  }, []);

  const api = useMemo<FeedbackApi>(() => ({ open, setItem }), [open, setItem]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <FeedbackSheet
        key={openCount}
        locale={locale}
        role={role}
        open={isOpen}
        item={openItem}
        onClose={() => setIsOpen(false)}
      />
    </FeedbackContext.Provider>
  );
}

/**
 * Returnerar null utanför providern. Rapporteringen renderas bara för elever,
 * så en knapp i delad app-chrome måste tåla att den inte finns — därför
 * `| null` i stället för ett kastande krav.
 */
export function useFeedback(): FeedbackApi | null {
  return useContext(FeedbackContext);
}
