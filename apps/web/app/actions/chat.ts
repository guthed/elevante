'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import type { ChatScope, ChatSource } from '@/lib/supabase/database';
import { anthropicIsConfigured, answerWithRag, type RagChunk } from '@/lib/ai/anthropic';
import { bergetIsConfigured, embedTexts } from '@/lib/ai/berget';

export type SendMessageState =
  | { status: 'idle' }
  | { status: 'success'; chatId: string }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'generic'; detail?: string };

/**
 * Riktig RAG via Berget AI (embeddings) + Anthropic (svar).
 * Returnerar null om någon del saknas så anroparen faller tillbaka
 * till mockedAnswer.
 */
type ScopeContext = {
  scope: ChatScope;
  lessonId: string | null;
  courseId: string | null;
  lessonIds: string[] | null;
};

async function ragAnswer(
  question: string,
  scopeContext: ScopeContext,
): Promise<{ content: string; sources: ChatSource[]; concepts: string[] } | null> {
  if (!bergetIsConfigured() || !anthropicIsConfigured()) return null;

  const supabase = await createSupabaseServerClient();

  // Hämta lektionens koncept för taggning (bara för lesson-scope)
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

  // Steg 1: embedda användarens fråga
  const embeddings = await embedTexts([question]);
  if (!embeddings || embeddings.length === 0) return null;
  const queryEmbedding = embeddings[0]!;

  // Steg 2: vector-search via en av match_*_chunks RPC:erna
  type MatchRow = {
    id: string;
    lesson_id?: string;
    content: string;
    similarity: number;
  };
  // Cast supabase till any för RPC-anropen — match_*_chunks finns i schemat
  // men deklareras inte i Database-typen (se kommentar i database.ts).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpcClient = supabase as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: MatchRow[] | null }> };
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

  if (matches.length === 0) {
    return {
      content:
        scopeContext.scope === 'lesson'
          ? 'Det togs inte upp på den här lektionen.'
          : 'Det togs inte upp i lektionerna du valt.',
      sources: [],
      concepts: [],
    };
  }

  // Steg 3: hämta lessons-titlar för citaten
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

  // Steg 4: Claude-svar med strikt RAG-prompt + koncept-taggning
  const answer = await answerWithRag(question, chunks, lessonConcepts);
  return answer;
}

/**
 * Mockat fallback-svar när Berget AI eller Anthropic inte är konfigurerade.
 * Behålls i kodbasen så lokal utveckling fungerar utan keys.
 */
async function mockedAnswer(
  question: string,
  scopeContext: ScopeContext,
): Promise<{ content: string; sources: ChatSource[]; concepts: string[] }> {
  const supabase = await createSupabaseServerClient();

  // Försök hitta en lektion att referera till — den aktuella (lesson-scope),
  // en av de valda (selection-scope) eller en lektion i kursen (course-scope).
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
            '[Mockad utdrag] Detta avsnitt täcker frågan men ersätts av riktiga transkript-segment i Fas 6.',
        },
      ]
    : [];

  const lead = lessonTitle ? `Enligt lektionen "${lessonTitle}"` : 'Enligt din lektion';

  return {
    content:
      `${lead} kan jag inte ge ett riktigt svar ännu — det här är en mockad svar tills KB-Whisper-pipelinen är på plats i Fas 6.\n\n` +
      `Din fråga: "${question}"\n\n` +
      'När den riktiga RAG-funktionen är aktiverad kommer Elevante att:\n' +
      '• söka i transkriberingen av lektionen\n' +
      '• returnera ett svar som bara bygger på det läraren sa\n' +
      '• visa exakta källcitat under svaret',
    sources,
    concepts: [] as string[],
  };
}

type StartChatInput = {
  scope: ChatScope;
  lessonId?: string;
  courseId?: string;
  lessonIds?: string[];
  question: string;
};

/** Skapar en ny chat och första frågan + svaret. Redirectar till chat-tråden. */
export async function startChat(input: StartChatInput) {
  const profile = await getCurrentProfile();
  if (!profile || !profile.school_id) {
    return { ok: false as const, code: 'unauthorized' };
  }
  if (!input.question.trim()) {
    return { ok: false as const, code: 'invalid' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: chat, error } = await supabase
    .from('chats')
    .insert({
      school_id: profile.school_id,
      user_id: profile.id,
      scope: input.scope,
      lesson_id: input.lessonId ?? null,
      course_id: input.courseId ?? null,
      lesson_ids: input.lessonIds ?? null,
      title: input.question.slice(0, 80),
    })
    .select('id')
    .single();

  if (error || !chat) {
    return { ok: false as const, code: 'generic', detail: error?.message };
  }

  await supabase.from('chat_messages').insert({
    chat_id: chat.id,
    role: 'user',
    content: input.question,
  });

  const scopeContext: ScopeContext = {
    scope: input.scope,
    lessonId: input.lessonId ?? null,
    courseId: input.courseId ?? null,
    lessonIds: input.lessonIds ?? null,
  };
  const answer =
    (await ragAnswer(input.question, scopeContext)) ??
    (await mockedAnswer(input.question, scopeContext));

  await supabase.from('chat_messages').insert({
    chat_id: chat.id,
    role: 'assistant',
    content: answer.content,
    sources: answer.sources,
    concepts: answer.concepts,
  });

  // Tagga också user-meddelandet med samma koncept (frågan tangerar dem)
  if (answer.concepts.length > 0) {
    await supabase
      .from('chat_messages')
      .update({ concepts: answer.concepts })
      .eq('chat_id', chat.id)
      .eq('role', 'user');
  }

  return { ok: true as const, chatId: chat.id };
}

/** Skicka ny fråga till en befintlig chat (används i chat-vyn). */
export async function sendMessage(
  _prev: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const profile = await getCurrentProfile();
  if (!profile) return { status: 'error', code: 'unauthorized' };

  const chatId = (formData.get('chat_id') ?? '').toString();
  const question = (formData.get('question') ?? '').toString().trim();
  if (!chatId || !question) return { status: 'error', code: 'invalid' };

  const supabase = await createSupabaseServerClient();
  const { data: chat } = await supabase
    .from('chats')
    .select('id, scope, lesson_id, course_id, lesson_ids')
    .eq('id', chatId)
    .maybeSingle();

  if (!chat) return { status: 'error', code: 'unauthorized' };

  await supabase
    .from('chat_messages')
    .insert({ chat_id: chatId, role: 'user', content: question });

  const scopeContext: ScopeContext = {
    scope: chat.scope,
    lessonId: chat.lesson_id,
    courseId: chat.course_id,
    lessonIds: chat.lesson_ids,
  };
  const answer =
    (await ragAnswer(question, scopeContext)) ??
    (await mockedAnswer(question, scopeContext));

  const { error: insertError } = await supabase.from('chat_messages').insert({
    chat_id: chatId,
    role: 'assistant',
    content: answer.content,
    sources: answer.sources,
    concepts: answer.concepts,
  });

  if (insertError) {
    return { status: 'error', code: 'generic', detail: insertError.message };
  }

  // Tagga senaste user-meddelandet med samma koncept (frågan tangerar dem)
  if (answer.concepts.length > 0) {
    const { data: latestUserMsg } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('chat_id', chatId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestUserMsg?.id) {
      await supabase
        .from('chat_messages')
        .update({ concepts: answer.concepts })
        .eq('id', latestUserMsg.id);
    }
  }

  // Bumpa updated_at via en touch-update
  await supabase.from('chats').update({ title: chat.id }).eq('id', chatId);

  revalidatePath(`/sv/app/student/chat/${chatId}`);
  revalidatePath(`/en/app/student/chat/${chatId}`);
  return { status: 'success', chatId };
}

/** Server Action som skapar en chat och redirectar till tråden. Används från lesson-detail. */
export async function startLessonChat(formData: FormData): Promise<void> {
  const lessonId = (formData.get('lesson_id') ?? '').toString();
  const question = (formData.get('question') ?? '').toString().trim();
  const locale = ((formData.get('locale') ?? 'sv').toString()) as 'sv' | 'en';
  if (!lessonId || !question) return;

  const result = await startChat({ scope: 'lesson', lessonId, question });
  if (result.ok) {
    redirect(`/${locale}/app/student/chat/${result.chatId}`);
  }
}

export async function startCourseChat(formData: FormData): Promise<void> {
  const courseId = (formData.get('course_id') ?? '').toString();
  const question = (formData.get('question') ?? '').toString().trim();
  const locale = ((formData.get('locale') ?? 'sv').toString()) as 'sv' | 'en';
  if (!courseId || !question) return;

  const result = await startChat({ scope: 'course', courseId, question });
  if (result.ok) {
    redirect(`/${locale}/app/student/chat/${result.chatId}`);
  }
}

/** Provplugg: starta en chat mot ett urval av lektioner i en kurs. */
export async function startExamPrepChat(formData: FormData): Promise<void> {
  const courseId = (formData.get('course_id') ?? '').toString();
  const question = (formData.get('question') ?? '').toString().trim();
  const locale = ((formData.get('locale') ?? 'sv').toString()) as 'sv' | 'en';
  const lessonIds = formData
    .getAll('lesson_ids')
    .map((v) => v.toString())
    .filter(Boolean);
  if (!courseId || !question || lessonIds.length === 0) return;

  const result = await startChat({
    scope: 'selection',
    courseId,
    lessonIds,
    question,
  });
  if (result.ok) {
    redirect(`/${locale}/app/student/chat/${result.chatId}`);
  }
}
