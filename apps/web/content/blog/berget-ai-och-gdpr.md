---
title: "Berget AI och GDPR – därför ska elevdata stanna i Sverige"
description: "Med Elevante stannar all elevdata i Sverige hos Berget AI – ingen överföring till USA, DPA-paket vid avtal. Så blir GDPR en formell rutin i stället för ett juridiskt projekt."
date: "2026-05-08"
category: "GDPR & juridik"
---

GDPR är ingen ny fråga i skolan. Men skälet till att många skolor väntar med AI-projekt är oftast precis det: oklarhet kring var data tar vägen, vem som har åtkomst, och vad som händer när en elev säger upp sitt samtycke.

Elevante är byggt med svaret på det inbyggt från dag ett: hela databehandlingen sker i Sverige, hos en svensk leverantör.

## Vad svensk infrastruktur betyder i praktiken

Elevante använder [Berget AI](https://berget.ai/), en svensk leverantör av AI-infrastruktur som driver sina GPU:er i Sverige. [Berget AI: all data och beräkning fysiskt i Sverige, immun mot US Cloud Act](https://berget.ai/). Det betyder:

- Inspelningarna från lärarens klassrum laddas upp till svenska servrar.
- Transkriberingen via KB-Whisper sker på svenska GPU:er.
- De vektorrepresentationer (embeddings) som används för RAG lagras i svenska Supabase-databaser inom EU.
- Endast vid förfrågan till språkmodell (Claude) skickas relevanta utdrag, och då till en EU-baserad endpoint.

Inga elev- eller lärardata lämnar EU. Inga ljudfiler lagras längre än nödvändigt – rådatan raderas efter transkribering. Det är en arkitektur som gör DPA-arbetet betydligt enklare för huvudmannen.

## Den juridiska basen

GDPR kräver att personuppgifter behandlas på en rättslig grund. För en skola är den vanligaste basen ”utförande av uppgift av allmänt intresse” – grundlagen för skolans hela databehandling. Det gör att en skola inte behöver inhämta samtycke från varje enskild elev för att använda Elevante – men kräver att tjänsten är dokumenterad i registerförteckningen och har en DPA på plats.

Elevante levererar DPA-mall, ROPA-stoff och dokumentation för dataskyddsombudet vid avtalstecknande.

## Därför inte amerikansk infrastruktur

Det finns andra AI-lösningar på marknaden som körs hos OpenAI, Anthropic direkt eller hos Microsoft. För en skola är problemet då inte tekniken, det är juridiken.

Schrems II-domen från EU-domstolen 2020 satte stora frågetecken kring överföring av personuppgifter till USA. Företag som baseras där måste idag ha kompletterande skyddsmekanismer på plats, men det betyder ofta att en skola tar på sig en riskbedömning som går utöver vad de primärt ska syssla med.

Med Elevante är den frågan redan löst. Datan går inte till USA. Punkt slut.

## Vad det betyder för en huvudman

För en huvudman som ska godkänna en ny tjänst i skolan finns det normalt en bunt frågor:

- Var lagras data? – Sverige.
- Vem har åtkomst? – Skolans egen administration, plus en begränsad teknisk driftåtkomst hos Elevante.
- Hur länge sparas data? – Transkripten så länge skolan vill använda dem. Ljudet raderas automatiskt efter transkribering.
- Vad händer vid avslut? – Datan exporteras till skolan eller raderas, efter skolans val.
- Vem är personuppgiftsbiträde? – Elevante AB, med svensk juridik.

[Berget AI har 300+ aktiva kunder och 2,1 M€ i seedfinansiering (2026)](https://berget.ai/). [Riksbanken är flaggskeppskund hos Berget AI](https://berget.ai/).

## Sammanfattning

- Hela databehandlingen sker i Sverige.
- Den rättsliga basen är etablerad.
- DPA-paket levereras vid avtalstecknande.
- För en huvudman blir GDPR-frågan en formell rutin, inte ett juridiskt projekt.
