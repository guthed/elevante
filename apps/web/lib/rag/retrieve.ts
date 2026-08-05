import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ChatScope, ChatSource } from '@/lib/supabase/database';
import { anthropicIsConfigured, type RagChunk } from '@/lib/ai/anthropic';
import { bergetIsConfigured, embedTexts } from '@/lib/ai/berget';

// Delad hämtningsdel för RAG. Bröts ut ur app/actions/chat.ts när app-chatten
// fick streaming: Server Action (icke-strömmande fallback) och
// /api/chat/stream måste hämta EXAKT samma kontext, annars skiljer sig svaren
// beroende på om klienten kan strömma eller inte.

export type ScopeContext = {
  scope: ChatScope;
  lessonId: string | null;
  courseId: string | null;
  lessonIds: string[] | null;
};

export type RetrievedContext = {
  /** Tom array = inget relevant hittades → anroparen ska svara med refusal. */
  chunks: RagChunk[];
  lessonConcepts: string[];
};

/** True när både embeddings (Berget) och svarsmodellen (Anthropic) är konfigurerade. */
export function ragIsConfigured(): boolean {
  return bergetIsConfigured() && anthropicIsConfigured();
}

/** Refusal-texten när vector-sökningen inte hittar något i elevens urval. */
export function refusalFor(scope: ChatScope): string {
  return scope === 'lesson'
    ? 'Det togs inte upp på den här lektionen.'
    : 'Det togs inte upp i lektionerna du valt.';
}

/** Bygger källcitaten som visas under svaret. Samma format som answerWithRag. */
export function sourcesFrom(chunks: RagChunk[]): ChatSource[] {
  return chunks.map((chunk) => ({
    lesson_id: chunk.lessonId,
    lesson_title: chunk.lessonTitle,
    excerpt: chunk.content.slice(0, 240),
  }));
}

/**
 * Embeddar frågan, kör vector-sökning i rätt scope och plockar fram
 * lektionstitlar för citaten. Returnerar null om AI-nycklar saknas — anroparen
 * faller då tillbaka till mockat svar.
 */
export async function retrieveContext(
  question: string,
  scopeContext: ScopeContext,
): Promise<RetrievedContext | null> {
  if (!ragIsConfigured()) return null;

  const supabase = await createSupabaseServerClient();

  // Lektionens koncept används för att tagga frågan (bara för lesson-scope).
  let lessonConcepts: string[] = [];
  if (scopeContext.scope === 'lesson' && scopeContext.lessonId) {
    const { data: lessonRow } = await supabase
      .from('lessons')
      .select('concepts')
      .eq('id', scopeContext.lessonId)
      .maybeSingle();
    lessonConcepts = Array.isArray(lessonRow?.concepts)
      ? (lessonRow.concepts as string[])
      : [];
  }

  const embeddings = await embedTexts([question]);
  if (!embeddings || embeddings.length === 0) return null;
  const queryEmbedding = embeddings[0]!;

  type MatchRow = {
    id: string;
    lesson_id?: string;
    content: string;
    similarity: number;
  };
  // Cast för RPC-anropen — match_*_chunks finns i schemat men deklareras inte
  // i Database-typen (se kommentar i database.ts).
  const rpcClient = supabase as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: MatchRow[] | null }>;
  };

  let matches: MatchRow[] = [];
  if (scopeContext.scope === 'lesson' && scopeContext.lessonId) {
    const { data } = await rpcClient.rpc('match_lesson_chunks', {
      query_embedding: queryEmbedding,
      lesson_id_filter: scopeContext.lessonId,
      top_k: 5,
    });
    matches = (data ?? []).map((m) => ({
      ...m,
      lesson_id: scopeContext.lessonId ?? undefined,
    }));
  } else if (scopeContext.scope === 'course' && scopeContext.courseId) {
    const { data } = await rpcClient.rpc('match_course_chunks', {
      query_embedding: queryEmbedding,
      course_id_filter: scopeContext.courseId,
      top_k: 8,
    });
    matches = data ?? [];
  } else if (
    scopeContext.scope === 'selection' &&
    scopeContext.courseId &&
    scopeContext.lessonIds &&
    scopeContext.lessonIds.length > 0
  ) {
    const { data } = await rpcClient.rpc('match_course_chunks', {
      query_embedding: queryEmbedding,
      course_id_filter: scopeContext.courseId,
      top_k: 8,
      lesson_ids_filter: scopeContext.lessonIds,
    });
    matches = data ?? [];
  }

  if (matches.length === 0) return { chunks: [], lessonConcepts };

  const lessonIds = Array.from(
    new Set(matches.map((m) => m.lesson_id).filter((id): id is string => !!id)),
  );
  const { data: lessonRows } = await supabase
    .from('lessons')
    .select('id, title')
    .in('id', lessonIds);
  const titleById = new Map(
    ((lessonRows ?? []) as { id: string; title: string | null }[]).map((l) => [
      l.id,
      l.title,
    ]),
  );

  const chunks: RagChunk[] = matches.map((m) => ({
    lessonId: m.lesson_id ?? scopeContext.lessonId ?? '',
    lessonTitle: m.lesson_id ? (titleById.get(m.lesson_id) ?? null) : null,
    content: m.content,
  }));

  return { chunks, lessonConcepts };
}

/** Elevens lärprofil-sammanfattning, för personanpassade svar. */
export async function getPersonaSummary(userId: string): Promise<string | undefined> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('learner_profiles')
    .select('summary')
    .eq('profile_id', userId)
    .maybeSingle();
  const summary = (data as { summary: string } | null)?.summary;
  return summary && summary.trim().length > 0 ? summary : undefined;
}

/**
 * Mockat fallback-svar när Berget AI eller Anthropic inte är konfigurerade.
 * Behålls så lokal utveckling fungerar utan keys.
 */
export async function mockedAnswer(
  question: string,
  scopeContext: ScopeContext,
): Promise<{ content: string; sources: ChatSource[]; concepts: string[] }> {
  const supabase = await createSupabaseServerClient();

  let lessonId: string | null = scopeContext.lessonId;
  let lessonTitle: string | null = null;

  if (!lessonId && scopeContext.scope === 'selection' && scopeContext.lessonIds?.length) {
    const { data } = await supabase
      .from('lessons')
      .select('id, title')
      .in('id', scopeContext.lessonIds)
      .order('recorded_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      lessonId = data.id;
      lessonTitle = data.title;
    }
  } else if (!lessonId && scopeContext.courseId) {
    const { data } = await supabase
      .from('lessons')
      .select('id, title')
      .eq('course_id', scopeContext.courseId)
      .order('recorded_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      lessonId = data.id;
      lessonTitle = data.title;
    }
  } else if (lessonId) {
    const { data } = await supabase
      .from('lessons')
      .select('title')
      .eq('id', lessonId)
      .maybeSingle();
    lessonTitle = data?.title ?? null;
  }

  const sources: ChatSource[] = lessonId
    ? [
        {
          lesson_id: lessonId,
          lesson_title: lessonTitle,
          excerpt:
            '[Mockad utdrag] Detta avsnitt täcker frågan men ersätts av riktiga transkript-segment när AI-nycklar är satta.',
        },
      ]
    : [];

  const lead = lessonTitle ? `Enligt lektionen "${lessonTitle}"` : 'Enligt din lektion';

  return {
    content:
      `${lead} kan jag inte ge ett riktigt svar just nu — AI-nycklarna saknas i den här miljön.\n\n` +
      `Din fråga: "${question}"\n\n` +
      'Med nycklar satta söker Elevante i lektionens transkript, svarar bara utifrån det läraren sa, och visar exakta källcitat under svaret.',
    sources,
    concepts: [] as string[],
  };
}
