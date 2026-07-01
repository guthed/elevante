import Anthropic from '@anthropic-ai/sdk';
import type { SchoolFacts } from './skolverket';

type BriefInput = SchoolFacts & { name: string; students: number | null };

export async function generateSchoolBrief(input: BriefInput): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[brief] ANTHROPIC_API_KEY saknas — hoppar över brief.');
    return null;
  }
  const facts = [
    `Skola: ${input.name}`,
    input.municipality && `Kommun/område: ${input.municipality}`,
    input.principalType && `Huvudmannatyp: ${input.principalType}`,
    input.huvudman && `Huvudman: ${input.huvudman}`,
    input.orientation && `Inriktning: ${input.orientation}`,
    input.students != null && `Antal elever: ${input.students}`,
  ].filter(Boolean).join('\n');

  const anthropic = new Anthropic({ apiKey });
  const msg = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929',
    max_tokens: 250,
    system:
      'Du skriver en kort, saklig BESKRIVNING av en svensk skola på svenska — en intern ' +
      'faktasammanfattning för en säljare på EdTech-bolaget Elevante. Det är INTE ett mejl: ' +
      'inga hälsningsfraser, ingen mottagare, ingen avslutning. Skriv 2–3 meningar i tredje ' +
      'person som beskriver skolan (storlek, huvudman, inriktning). Använd ENDAST de fakta ' +
      'du får — hitta inte på något.',
    messages: [{ role: 'user', content: `Fakta:\n${facts}\n\nSkriv sammanfattningen.` }],
  });
  const block = msg.content.find((b) => b.type === 'text');
  return block && block.type === 'text' ? block.text.trim() : null;
}

// Fast mall (ingen AI). Mejlet är medvetet generiskt och rakt på sak — identiskt
// för alla skolor, bara ägarnamnet varierar. Signeras med kortets Ägare. `_input`
// behålls i signaturen för bakåtkompatibilitet med anroparen men används inte.
export function generateContactEmail(
  _input: BriefInput,
  ownerName: string | null,
): string {
  const namn = ownerName ?? '[Ditt namn]';
  return [
    'Hej!',
    '',
    `Jag heter ${namn} och driver Elevante AB. Elevante spelar in lektioner, ` +
      'transkriberar dem och låter elever ställa frågor till dem i efterhand — i egen takt, ' +
      'med svar grundade i den egna lektionen, inte ett generiskt svar från nätet.',
    '',
    'Vill du veta mer? Läs på elevante.se eller svara på det här mejlet, så berättar jag gärna.',
    '',
    'Vänliga hälsningar,',
    namn,
  ].join('\n');
}
