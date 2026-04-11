'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import type { ChatScope, ChatSource } from '@/lib/supabase/database';

export type SendMessageState =
  | { status: 'idle' }
  | { status: 'success'; chatId: string }
  | { status: 'error'; code: 'unauthorized' | 'invalid' | 'generic'; detail?: string };

/**
 * Mockad RAG-funktion. Riktig version i Fas 6 kommer:
 * 1. Hämta embeddings för användarens fråga via Berget AI
 * 2. Vector-search mot lesson-chunks
 * 3. Skicka top-k chunks + fråga till Claude API med strikt RAG-prompt
 * 4. Returnera Claude-svar + källor
 *
 * Just nu: returnera ett mockat svar med en fake källa, så UI:t kan
 * utvecklas och testas utan att vara beroende av Berget AI.
 */
async function mockedAnswer(
  question: string,
  scopeContext: { scope: ChatScope; lessonId: string | null; courseId: string | null },
): Promise<{ content: string; sources: ChatSource[] }> {
  const supabase = await createSupabaseServerClient();

  // Försök hitta en lektion att referera till — antingen den aktuella
  // (lesson-scope) eller en lektion i kursen (course-scope).
  let lessonId: string | null = scopeContext.lessonId;
  let lessonTitle: string | null = null;

  if (!lessonId && scopeContext.courseId) {
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
  };
}

type StartChatInput = {
  scope: ChatScope;
  lessonId?: string;
  courseId?: string;
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

  const answer = await mockedAnswer(input.question, {
    scope: input.scope,
    lessonId: input.lessonId ?? null,
    courseId: input.courseId ?? null,
  });

  await supabase.from('chat_messages').insert({
    chat_id: chat.id,
    role: 'assistant',
    content: answer.content,
    sources: answer.sources,
  });

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
    .select('id, scope, lesson_id, course_id')
    .eq('id', chatId)
    .maybeSingle();

  if (!chat) return { status: 'error', code: 'unauthorized' };

  await supabase
    .from('chat_messages')
    .insert({ chat_id: chatId, role: 'user', content: question });

  const answer = await mockedAnswer(question, {
    scope: chat.scope,
    lessonId: chat.lesson_id,
    courseId: chat.course_id,
  });

  const { error: insertError } = await supabase.from('chat_messages').insert({
    chat_id: chatId,
    role: 'assistant',
    content: answer.content,
    sources: answer.sources,
  });

  if (insertError) {
    return { status: 'error', code: 'generic', detail: insertError.message };
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
