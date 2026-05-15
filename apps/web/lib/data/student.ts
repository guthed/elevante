import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  TranscriptStatus,
  PracticeTest,
  LearnerProfile,
} from '@/lib/supabase/database';

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

  const lessonRows: StudentLessonRow[] = ((lessons ?? []) as unknown as LessonJoin[]).map(
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
  return ((data ?? []) as unknown as LessonJoin[]).map((row) => ({
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
  summary: string | null;
  suggestedQuestions: string[];
  aiGeneratedTopic: string | null;
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
      'id, title, recorded_at, transcript_status, transcript_text, summary, suggested_questions, ai_generated_topic, courses ( id, code, name ), profiles!lessons_teacher_id_fkey ( id, full_name )',
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
    summary: string | null;
    suggested_questions: unknown;
    ai_generated_topic: string | null;
    courses: { id: string; code: string; name: string } | null;
    profiles: { id: string; full_name: string | null } | null;
  };
  const typed = lesson as unknown as LessonRow;

  // Spåra att eleven öppnat lektionen (fire-and-forget, ej critical path)
  try {
    const rpcClient = supabase as unknown as {
      rpc: (n: string, args: Record<string, unknown>) => Promise<{ error: unknown }>;
    };
    await rpcClient.rpc('track_lesson_view', { lesson_id_arg: lessonId });
  } catch (err) {
    console.warn('track_lesson_view failed:', err);
  }

  return {
    id: typed.id,
    title: typed.title,
    recordedAt: typed.recorded_at,
    status: typed.transcript_status,
    transcriptText: typed.transcript_text,
    summary: typed.summary ?? null,
    suggestedQuestions: Array.isArray(typed.suggested_questions) ? (typed.suggested_questions as string[]) : [],
    aiGeneratedTopic: typed.ai_generated_topic ?? null,
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
    scope: 'lesson' | 'course' | 'selection';
    lesson_id: string | null;
    course_id: string | null;
    lesson_ids: string[] | null;
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
    .select('id, scope, lesson_id, course_id, lesson_ids, title')
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

export type ProvpluggLesson = {
  id: string;
  title: string | null;
  recordedAt: string | null;
};

export type ProvpluggCourse = {
  id: string;
  code: string;
  name: string;
  lessons: ProvpluggLesson[];
};

/**
 * Kurser med sina färdigtranskriberade lektioner — underlag för Provplugg.
 * Bara 'ready'-lektioner tas med: en lektion utan transkript har inga
 * chunks att söka i, så det vore meningslöst att kunna välja den.
 */
export async function getStudentCoursesWithLessons(
  studentId: string,
): Promise<ProvpluggCourse[]> {
  const supabase = await createSupabaseServerClient();
  const classIds = await getStudentClassIds(studentId);
  if (classIds.length === 0) return [];

  type LessonJoin = {
    id: string;
    title: string | null;
    recorded_at: string | null;
    course_id: string;
    courses: { id: string; code: string; name: string } | null;
  };

  const { data } = await supabase
    .from('lessons')
    .select('id, title, recorded_at, course_id, courses ( id, code, name )')
    .in('class_id', classIds)
    .eq('transcript_status', 'ready')
    .order('recorded_at', { ascending: true, nullsFirst: false })
    .limit(300);

  const byCourse = new Map<string, ProvpluggCourse>();
  for (const row of (data ?? []) as unknown as LessonJoin[]) {
    const course = row.courses;
    if (!course) continue;
    let entry = byCourse.get(course.id);
    if (!entry) {
      entry = { id: course.id, code: course.code, name: course.name, lessons: [] };
      byCourse.set(course.id, entry);
    }
    entry.lessons.push({
      id: row.id,
      title: row.title,
      recordedAt: row.recorded_at,
    });
  }

  return Array.from(byCourse.values()).filter((c) => c.lessons.length > 0);
}

export type PracticeTestWithMeta = {
  test: PracticeTest;
  courseName: string | null;
  studentName: string | null;
  lessonTitles: Record<string, string>;
};

/** Hämtar ett testprov + kursnamn, elevnamn och lektionstitlar för visning. */
export async function getPracticeTest(
  testId: string,
): Promise<PracticeTestWithMeta | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('practice_tests')
    .select('*')
    .eq('id', testId)
    .maybeSingle();

  const test = data as PracticeTest | null;
  if (!test) return null;

  const { data: course } = await supabase
    .from('courses')
    .select('name')
    .eq('id', test.course_id)
    .maybeSingle();

  const { data: student } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', test.user_id)
    .maybeSingle();

  const { data: lessonRows } = await supabase
    .from('lessons')
    .select('id, title')
    .in('id', test.lesson_ids);

  const lessonTitles: Record<string, string> = {};
  for (const row of (lessonRows ?? []) as { id: string; title: string | null }[]) {
    if (row.title) lessonTitles[row.id] = row.title;
  }

  return {
    test,
    courseName: (course as { name: string } | null)?.name ?? null,
    studentName: (student as { full_name: string | null } | null)?.full_name ?? null,
    lessonTitles,
  };
}

/** Elevens lärprofil. Null om eleven inte gjort något prov ännu. */
export async function getLearnerProfile(
  userId: string,
): Promise<LearnerProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('learner_profiles')
    .select('*')
    .eq('profile_id', userId)
    .maybeSingle();
  return (data as LearnerProfile | null) ?? null;
}
