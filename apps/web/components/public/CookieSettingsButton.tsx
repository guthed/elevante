'use client';

// Öppnar cookie-samtyckesbannern igen så användaren kan ändra sitt val.
export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new Event('elevante:open-cookie-settings'))
      }
      className="text-[0.9375rem] text-[var(--color-ink)] underline underline-offset-4 transition-colors hover:text-[var(--color-coral)]"
    >
      {label}
    </button>
  );
}
