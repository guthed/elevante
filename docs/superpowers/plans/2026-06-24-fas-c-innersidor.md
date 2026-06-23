# Fas C — Innersidor (mobil) Implementation Plan

> Executes spec Del 3 (högtrafik-vyer). Verifiering: typecheck/lint/build + preview 375px & 1280px (Anna + Elin).

**Goal:** Gör de mest använda innersidorna användbara på mobil utan att tappa laptop-vyn.

**Spec:** [../specs/2026-06-23-inloggade-vyer-redesign-design.md](../specs/2026-06-23-inloggade-vyer-redesign-design.md) Del 3.

## Scope (Fas C)
- **C1 — Chat mobil-fokus.** Landningen: prompten primär, historiken under (reorder). Tråden: historiken dold på mobil + "← Chattar"-länk; tråden primär.
- **C2 — Lärar-lektionslista.** `<table>` blir staplade radkort på mobil (`md:hidden` kort + `hidden md:block` tabell). Behåll statusfilter.
- **C3 — Insikts-heatmap.** Sticky första kolumn (elevnamn) under horisontell scroll, så man alltid ser vems rad det är. Mindre padding på mobil.
- **C4 — Overflow-säkring.** `min-w-0` på grid-barnen i `StudentLessonDetail` och `TeacherLessonDetail`.

## Utanför Fas C (→ Fas D)
InsightDrawer → bottom-sheet på mobil, bibliotek-finlir, transkript-kopiera-knapp, prov/provplugg/profil/klasser.

## Filer
- `apps/web/app/[locale]/app/[role]/chat/page.tsx` (C1 landning)
- `apps/web/app/[locale]/app/[role]/chat/[id]/page.tsx` (C1 tråd)
- `apps/web/app/[locale]/app/[role]/lektioner/page.tsx` (C2)
- `apps/web/components/app/teacher/InsightHeatmap.tsx` (C3)
- `apps/web/components/app/teacher/TeacherLessonDetail.tsx` (C4)
- `apps/web/components/app/student/StudentLessonDetail.tsx` (C4)
- i18n: ev. ny sträng "Alla chattar"/"All chats" + "Senaste"/"Recent" återanvänds.
