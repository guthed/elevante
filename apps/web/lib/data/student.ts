import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TranscriptStatus } from '@/lib/supabase/database';

export type StudentLessonRow = {
  id: string;
  title: string | null;
  recordedAt: string | null;
  status: TranscriptStatus;
  courseId: string | null;
  courseName: string | null;
  courseCode: string | null;
  className: string | null;
};

export type StudentCourseRow = {
  id: string;
  code: string;
  name: string;
  lessonsCount: number;
};

export type StudentOverview = {
  courses: StudentCourseRow[];
  recentLessons: StudentLessonRow[];
};

async function getStudentClassIds(studentId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('profile_id', studentId);
  return ((data ?? []) as { class_id: string }[]).map((r) => r.class_id);
}

export async function getStudentOverview(
  studentId: string,
): Promise<StudentOverview> {
  const supabase = await createSupabaseServerClient();
  const classIds = await getStudentClassIds(studentId);

  if (classIds.length === 0) {
    return { courses: [], recentLessons: [] };
  }

  type LessonJoin = {
    id: string;
    title: string | null;
    recorded_at: string | null;
    transcript_status: TranscriptStatus;
    course_id: string;
    courses: { id: string; code: string; name: string } | null;
    classes: { name: string } | null;
  };

  const { data: lessons } = await supabase
    .from('lessons')
    .select(
      'id, title, recorded_at, transcript_status, course_id, courses ( id, code, name ), classes ( name )',
    )
    .in('class_id', classIds)
    .order('recorded_at', { ascending: false, nullsFirst: false })
    .limit(50);

  const lessonRows: StudentLessonRow[] = ((lessons ?? []) as LessonJoin[]).map(
    (row) => ({
      id: row.id,
      title: row.title,
      recordedAt: row.recorded_at,
      status: row.transcript_status,
      courseId: row.courses?.id ?? row.course_id,
      courseName: row.courses?.name ?? null,
      courseCode: row.courses?.code ?? null,
      className: row.classes?.name ?? null,
    }),
  );

  const counts = new Map<string, StudentCourseRow>();
  for (const row of lessonRows) {
    if (!row.courseId || !row.courseCode || !row.courseName) continue;
    const existing = counts.get(row.courseId);
    if (existing) {
      existing.lessonsCount += 1;
    } else {
      counts.set(row.courseId, {
        id: row.courseId,
        code: row.courseCode,
        name: row.courseName,
        lessonsCount: 1,
      });
    }
  }

  return {
    courses: Array.from(counts.values()),
    recentLessons: lessonRows.slice(0, 6),
  };
}

export async function getStudentLibrary(
  studentId: string,
  courseFilter?: string,
): Promise<StudentLessonRow[]> {
  const supabase = await createSupabaseServerClient();
  const classIds = await getStudentClassIds(studentId);
  if (classIds.length === 0) return [];

  let query = supabase
    .from('lessons')
    .select(
      'id, title, recorded_at, transcript_status, course_id, courses ( id, code, name ), classes ( name )',
    )
    .in('class_id', classIds)
    .order('recorded_at', { ascending: false, nullsFirst: false })
    .limit(200);

  if (courseFilter) {
    query = query.eq('course_id', courseFilter);
  }

  type LessonJoin = {
    id: string;
    title: string | null;
    recorded_at: string | null;
    transcript_status: TranscriptStatus;
    course_id: string;
    courses: { id: string; code: string; name: string } | null;
    classes: { name: string } | null;
  };

  const { data } = await query;
  return ((data ?? []) as LessonJoin[]).map((row) => ({
    id: row.id,
    title: row.title,
    recordedAt: row.recorded_at,
    status: row.transcript_status,
    courseId: row.courses?.id ?? row.course_id,
    courseName: row.courses?.name ?? null,
    courseCode: row.courses?.code ?? null,
    className: row.classes?.name ?? null,
  }));
}

export type StudentLessonDetail = {
  id: string;
  title: string | null;
  recordedAt: string | null;
  status: TranscriptStatus;
  transcriptText: string | null;
  course: { id: string; code: string; name: string } | null;
  teacher: { id: string; full_name: string | null } | null;
  materials: {
    id: string;
    name: string;
    storage_path: string;
    mime_type: string | null;
    size_bytes: number | null;
    created_at: string;
  }[];
};

export async function getStudentLessonDetail(
  lessonId: string,
): Promise<StudentLessonDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: lesson } = await supabase
    .from('lessons')
    .select(
      'id, title, recorded_at, transcript_status, transcript_text, courses ( id, code, name ), profiles ( id, full_name )',
    )
    .eq('id', lessonId)
    .maybeSingle();
  if (!lesson) return null;

  const { data: materials } = await supabase
    .from('materials')
    .select('id, name, storage_path, mime_type, size_bytes, created_at')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false });

  type LessonRow = {
    id: string;
    title: string | null;
    recorded_at: string | null;
    transcript_status: TranscriptStatus;
    transcript_text: string | null;
    courses: { id: string; code: string; name: string } | null;
    profiles: { id: string; full_name: string | null } | null;
  };
  const typed = lesson as LessonRow;

  return {
    id: typed.id,
    title: typed.title,
    recordedAt: typed.recorded_at,
    status: typed.transcript_status,
    transcriptText: typed.transcript_text,
    course: typed.courses,
    teacher: typed.profiles,
    materials: (materials ?? []) as StudentLessonDetail['materials'],
  };
}

export type ChatHistoryRow = {
  id: string;
  title: string | null;
  scope: 'lesson' | 'course';
  lesson_id: string | null;
  course_id: string | null;
  updated_at: string;
};

export async function getUserChatHistory(): Promise<ChatHistoryRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('chats')
    .select('id, title, scope, lesson_id, course_id, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20);
  return (data ?? []) as ChatHistoryRow[];
}

export type ChatThread = {
  chat: {
    id: string;
    scope: 'lesson' | 'course';
    lesson_id: string | null;
    course_id: string | null;
    title: string | null;
  };
  messages: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources: { lesson_id: string; lesson_title: string | null; excerpt: string }[];
    created_at: string;
  }[];
};

export async function getChatThread(chatId: string): Promise<ChatThread | null> {
  const supabase = await createSupabaseServerClient();
  const { data: chat } = await supabase
    .from('chats')
    .select('id, scope, lesson_id, course_id, title')
    .eq('id', chatId)
    .maybeSingle();
  if (!chat) return null;

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content, sources, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  return {
    chat: chat as ChatThread['chat'],
    messages: (messages ?? []) as ChatThread['messages'],
  };
}
