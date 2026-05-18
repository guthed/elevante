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
      'Du skriver en kort, saklig säljbrief på svenska om en svensk gymnasieskola, ' +
      'för en säljare på EdTech-bolaget Elevante. Använd ENDAST de fakta du får — ' +
      'hitta inte på något. 2–3 meningar. Lyft det som är relevant inför en ' +
      'säljkontakt: storlek, huvudman, inriktning.',
    messages: [{ role: 'user', content: `Fakta:\n${facts}\n\nSkriv säljbriefen.` }],
  });
  const block = msg.content.find((b) => b.type === 'text');
  return block && block.type === 'text' ? block.text.trim() : null;
}
