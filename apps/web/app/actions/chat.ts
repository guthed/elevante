'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import type { ChatScope } from '@/lib/supabase/database';
import { answerWithRag } from '@/lib/ai/anthropic';
import {
  getPersonaSummary,
  mockedAnswer,
  refusalFor,
  retrieveContext,
  type ScopeContext,
} from '@/lib/rag/retrieve';

export type SendMessageState =
  | { status: 'idle' }
  | { status: 'success'; chatId: string }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'generic'; detail?: string };

/**
 * Icke-strömmande svar. Används numera bara som fallback när klienten inte kan
 * strömma (JavaScript av) — den vanliga vägen går via /api/chat/stream, som
 * visar första ordet efter ~1–2s i stället för att blockera i ~16s.
 * Hämtningsdelen delas med rutten via lib/rag/retrieve så svaren blir identiska.
 */
async function ragAnswer(
  question: string,
  scopeContext: ScopeContext,
  personaSummary?: string,
): Promise<{ content: string; sources: ChatSourceLike[]; concepts: string[] } | null> {
  const retrieved = await retrieveContext(question, scopeContext);
  if (retrieved === null) return null;

  if (retrieved.chunks.length === 0) {
    return { content: refusalFor(scopeContext.scope), sources: [], concepts: [] };
  }

  return answerWithRag(
    question,
    retrieved.chunks,
    retrieved.lessonConcepts,
    personaSummary,
  );
}

type ChatSourceLike = { lesson_id: string; lesson_title: string | null; excerpt: string };

type StartChatInput = {
  scope: ChatScope;
  lessonId?: string;
  courseId?: string;
  lessonIds?: string[];
  question: string;
};

/**
 * Skapar en ny chat och lägger in elevens fråga — men genererar INTE svaret.
 * Anroparen redirectar direkt till tråden, där ChatThread strömmar in svaret.
 * (Tidigare väntade den här funktionen ut hela Claude-anropet före redirect,
 * vilket gav ~16s vit skärm innan chatten ens visades.)
 */
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

  const { error: messageError } = await supabase.from('chat_messages').insert({
    chat_id: chat.id,
    role: 'user',
    content: input.question,
  });

  if (messageError) {
    return { ok: false as const, code: 'generic', detail: messageError.message };
  }

  return { ok: true as const, chatId: chat.id };
}

/**
 * Skicka ny fråga till en befintlig chat utan streaming.
 * Fallback för klienter utan JavaScript — ChatThread använder annars
 * /api/chat/stream. Behåll de två i synk: samma hämtning, samma persistering.
 */
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
  const personaSummary = await getPersonaSummary(profile.id);
  const answer =
    (await ragAnswer(question, scopeContext, personaSummary)) ??
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

  // Bumpa updated_at så chatten hamnar överst i historiken.
  // (Tidigare sattes title felaktigt till chat.id här, vilket gjorde att
  // chattnamn blev en UUID så fort en följdfråga skickades.)
  await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId);

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
