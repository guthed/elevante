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

export async function generateContactEmail(
  input: BriefInput,
  ownerName: string | null,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[brief] ANTHROPIC_API_KEY saknas — hoppar över kontaktmejl.');
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
  const signature = ownerName ?? '[Ditt namn]';

  const anthropic = new Anthropic({ apiKey });
  const msg = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929',
    max_tokens: 400,
    system:
      'Du skriver ett kort, varmt kontaktmejl på svenska från EdTech-bolaget Elevante till ' +
      'en svensk skola. Du-tilltal, max ~120 ord. Inkludera en mening om varför Elevante ' +
      'passar just den här skolan utifrån fakta. Mjuk avslutning med förslag på ett kort ' +
      'samtal. Avsluta EXAKT med raderna:\nVänliga hälsningar,\n' + signature + '\n' +
      'Använd bara givna fakta — hitta inte på något. Returnera enbart mejltexten.',
    messages: [{ role: 'user', content: `Fakta om skolan:\n${facts}\n\nSkriv kontaktmejlet.` }],
  });
  const block = msg.content.find((b) => b.type === 'text');
  return block && block.type === 'text' ? block.text.trim() : null;
}
