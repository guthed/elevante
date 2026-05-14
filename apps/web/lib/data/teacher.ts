import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TranscriptStatus } from '@/lib/supabase/database';

export type TeacherClassRow = {
  id: string;
  name: string;
  year: number | null;
  studentsCount: number;
};

export type TeacherCourseRow = {
  id: string;
  code: string;
  name: string;
};

export type TeacherLessonRow = {
  id: string;
  title: string | null;
  recordedAt: string | null;
  status: TranscriptStatus;
  courseName: string | null;
  className: string | null;
};

export type TeacherOverview = {
  classes: TeacherClassRow[];
  courses: TeacherCourseRow[];
  recentLessons: TeacherLessonRow[];
};

/** Hämtar översiktsdata för en lärare. Använder RLS — vi behöver inte filtrera per användare manuellt. */
export async function getTeacherOverview(teacherId: string): Promise<TeacherOverview> {
  const supabase = await createSupabaseServerClient();

  const [coursesRes, lessonsRes] = await Promise.all([
    supabase
      .from('course_teachers')
      .select('course_id, courses ( id, code, name )')
      .eq('profile_id', teacherId),
    supabase
      .from('lessons')
      .select(
        'id, title, recorded_at, transcript_status, courses ( name ), classes ( id, name )',
      )
      .eq('teacher_id', teacherId)
      .order('recorded_at', { ascending: false, nullsFirst: false })
      .limit(10),
  ]);

  type CourseTeacherJoin = {
    course_id: string;
    courses: { id: string; code: string; name: string } | null;
  };
  const courses: TeacherCourseRow[] = ((coursesRes.data ?? []) as CourseTeacherJoin[])
    .filter((row): row is CourseTeacherJoin & { courses: NonNullable<CourseTeacherJoin['courses']> } => row.courses !== null)
    .map((row) => ({
      id: row.courses.id,
      code: row.courses.code,
      name: row.courses.name,
    }));

  type LessonJoin = {
    id: string;
    title: string | null;
    recorded_at: string | null;
    transcript_status: TranscriptStatus;
    courses: { name: string } | null;
    classes: { id: string; name: string } | null;
  };
  const recentLessons: TeacherLessonRow[] = ((lessonsRes.data ?? []) as LessonJoin[]).map(
    (row) => ({
      id: row.id,
      title: row.title,
      recordedAt: row.recorded_at,
      status: row.transcript_status,
      courseName: row.courses?.name ?? null,
      className: row.classes?.name ?? null,
    }),
  );

  // Hämta klasser via klassmedlemmar i kurserna teacher undervisar
  const courseIds = courses.map((c) => c.id);
  let classes: TeacherClassRow[] = [];
  if (courseIds.length > 0) {
    // Hitta unika klasser via timeslots för dessa kurser
    const { data: timeslots } = await supabase
      .from('timeslots')
      .select('class_id, classes ( id, name, year )')
      .in('course_id', courseIds);

    type TimeslotJoin = {
      class_id: string;
      classes: { id: string; name: string; year: number | null } | null;
    };
    const seen = new Set<string>();
    const unique: { id: string; name: string; year: number | null }[] = [];
    for (const row of (timeslots ?? []) as TimeslotJoin[]) {
      if (!row.classes || seen.has(row.classes.id)) continue;
      seen.add(row.classes.id);
      unique.push(row.classes);
    }

    // Räkna elever per klass
    const counts = new Map<string, number>();
    if (unique.length > 0) {
      const { data: members } = await supabase
        .from('class_members')
        .select('class_id')
        .in(
          'class_id',
          unique.map((c) => c.id),
        );
      for (const m of (members ?? []) as { class_id: string }[]) {
        counts.set(m.class_id, (counts.get(m.class_id) ?? 0) + 1);
      }
    }

    classes = unique.map((c) => ({
      id: c.id,
      name: c.name,
      year: c.year,
      studentsCount: counts.get(c.id) ?? 0,
    }));
  }

  return { classes, courses, recentLessons };
}

export async function getTeacherClasses(teacherId: string): Promise<TeacherClassRow[]> {
  const overview = await getTeacherOverview(teacherId);
  return overview.classes;
}

export type ClassDetail = {
  id: string;
  name: string;
  year: number | null;
  members: { id: string; full_name: string | null; email: string | null }[];
  courses: TeacherCourseRow[];
  recentLessons: TeacherLessonRow[];
};

export async function getClassDetail(classId: string): Promise<ClassDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data: cls } = await supabase
    .from('classes')
    .select('id, name, year')
    .eq('id', classId)
    .maybeSingle();
  if (!cls) return null;

  const [membersRes, timeslotsRes, lessonsRes] = await Promise.all([
    supabase
      .from('class_members')
      .select('profile_id, profiles ( id, full_name, email )')
      .eq('class_id', classId),
    supabase
      .from('timeslots')
      .select('course_id, courses ( id, code, name )')
      .eq('class_id', classId),
    supabase
      .from('lessons')
      .select(
        'id, title, recorded_at, transcript_status, courses ( name ), classes ( id, name )',
      )
      .eq('class_id', classId)
      .order('recorded_at', { ascending: false, nullsFirst: false })
      .limit(10),
  ]);

  type MemberJoin = {
    profile_id: string;
    profiles: { id: string; full_name: string | null; email: string | null } | null;
  };
  const members = ((membersRes.data ?? []) as MemberJoin[])
    .filter((row): row is MemberJoin & { profiles: NonNullable<MemberJoin['profiles']> } => row.profiles !== null)
    .map((row) => row.profiles);

  type TimeslotCourseJoin = {
    course_id: string;
    courses: { id: string; code: string; name: string } | null;
  };
  const seen = new Set<string>();
  const courses: TeacherCourseRow[] = [];
  for (const row of (timeslotsRes.data ?? []) as TimeslotCourseJoin[]) {
    if (!row.courses || seen.has(row.courses.id)) continue;
    seen.add(row.courses.id);
    courses.push(row.courses);
  }

  type LessonJoin = {
    id: string;
    title: string | null;
    recorded_at: string | null;
    transcript_status: TranscriptStatus;
    courses: { name: string } | null;
    classes: { id: string; name: string } | null;
  };
  const recentLessons: TeacherLessonRow[] = ((lessonsRes.data ?? []) as LessonJoin[]).map(
    (row) => ({
      id: row.id,
      title: row.title,
      recordedAt: row.recorded_at,
      status: row.transcript_status,
      courseName: row.courses?.name ?? null,
      className: row.classes?.name ?? null,
    }),
  );

  return {
    id: cls.id,
    name: cls.name,
    year: cls.year,
    members,
    courses,
    recentLessons,
  };
}

export async function getTeacherLessons(teacherId: string): Promise<TeacherLessonRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('lessons')
    .select(
      'id, title, recorded_at, transcript_status, courses ( name ), classes ( id, name )',
    )
    .eq('teacher_id', teacherId)
    .order('recorded_at', { ascending: false, nullsFirst: false })
    .limit(100);

  type LessonJoin = {
    id: string;
    title: string | null;
    recorded_at: string | null;
    transcript_status: TranscriptStatus;
    courses: { name: string } | null;
    classes: { id: string; name: string } | null;
  };

  return ((data ?? []) as LessonJoin[]).map((row) => ({
    id: row.id,
    title: row.title,
    recordedAt: row.recorded_at,
    status: row.transcript_status,
    courseName: row.courses?.name ?? null,
    className: row.classes?.name ?? null,
  }));
}

export type LessonDetail = {
  id: string;
  title: string | null;
  recordedAt: string | null;
  status: TranscriptStatus;
  transcriptText: string | null;
  course: { id: string; code: string; name: string } | null;
  class: { id: string; name: string } | null;
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

export async function getLessonDetail(lessonId: string): Promise<LessonDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data: lesson } = await supabase
    .from('lessons')
    .select(
      'id, title, recorded_at, transcript_status, transcript_text, courses ( id, code, name ), classes ( id, name ), profiles!lessons_teacher_id_fkey ( id, full_name )',
    )
    .eq('id', lessonId)
    .maybeSingle();
  if (!lesson) return null;

  const { data: materialsRows } = await supabase
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
    classes: { id: string; name: string } | null;
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
    class: typed.classes,
    teacher: typed.profiles,
    materials: (materialsRows ?? []) as LessonDetail['materials'],
  };
}

// ---------------------------------------------------------------------------
// Teacher insight — koncept-heatmap + drilldowns
// ---------------------------------------------------------------------------

export type LessonInsightStudent = {
  id: string;
  fullName: string;
  hasViewed: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  totalQuestions: number;
  conceptQuestionCounts: Record<string, number>;
  questions: Array<{ id: string; content: string; concepts: string[]; createdAt: string }>;
};

export type LessonInsight = {
  lessonId: string;
  title: string | null;
  concepts: string[];
  students: LessonInsightStudent[];
};

export async function getLessonInsight(lessonId: string): Promise<LessonInsight | null> {
  const supabase = await createSupabaseServerClient();

  // 1. Hämta lessonen + class_id + concepts
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, class_id, concepts')
    .eq('id', lessonId)
    .maybeSingle();
  if (!lesson) return null;

  type LessonRow = {
    id: string;
    title: string | null;
    class_id: string;
    concepts: unknown;
  };
  const typedLesson = lesson as unknown as LessonRow;
  const concepts: string[] = Array.isArray(typedLesson.concepts)
    ? (typedLesson.concepts as string[])
    : [];

  // 2. Hämta klassens elever (profiler via class_members)
  const { data: members } = await supabase
    .from('class_members')
    .select('profile_id, profiles!inner(id, full_name, role)')
    .eq('class_id', typedLesson.class_id);

  type MemberRow = {
    profile_id: string;
    profiles: { id: string; full_name: string | null; role: string } | null;
  };

  const students = ((members ?? []) as unknown as MemberRow[])
    .map((m) => m.profiles)
    .filter(
      (p): p is { id: string; full_name: string | null; role: string } =>
        p !== null && p.role === 'student',
    );

  // 3. Hämta lesson_views
  const { data: viewsRaw } = await supabase
    .from('lesson_views')
    .select('profile_id, view_count, last_viewed_at')
    .eq('lesson_id', lessonId);
  const viewsByProfile = new Map<string, { count: number; last: string }>();
  for (const v of (viewsRaw ?? []) as Array<{
    profile_id: string;
    view_count: number;
    last_viewed_at: string;
  }>) {
    viewsByProfile.set(v.profile_id, {
      count: v.view_count ?? 0,
      last: v.last_viewed_at ?? '',
    });
  }

  // 4. Hämta chats + chat_messages för denna lesson, scope='lesson'
  const { data: chatsRaw } = await supabase
    .from('chats')
    .select('id, user_id')
    .eq('lesson_id', lessonId)
    .eq('scope', 'lesson');
  const chats = (chatsRaw ?? []) as Array<{ id: string; user_id: string }>;
  const chatIds = chats.map((c) => c.id);
  const userIdByChatId = new Map<string, string>();
  for (const c of chats) userIdByChatId.set(c.id, c.user_id);

  type MessageRow = {
    id: string;
    chat_id: string;
    content: string;
    concepts: unknown;
    created_at: string;
    role: string;
  };
  let messages: MessageRow[] = [];
  if (chatIds.length > 0) {
    const { data } = await supabase
      .from('chat_messages')
      .select('id, chat_id, content, concepts, created_at, role')
      .in('chat_id', chatIds)
      .eq('role', 'user');
    messages = (data ?? []) as MessageRow[];
  }

  // 5. Bygg per-elev-data
  const studentResults: LessonInsightStudent[] = students.map((s) => {
    const view = viewsByProfile.get(s.id);
    const studentMessages = messages.filter((m) => userIdByChatId.get(m.chat_id) === s.id);
    const conceptCounts: Record<string, number> = {};
    for (const m of studentMessages) {
      const mc: string[] = Array.isArray(m.concepts) ? (m.concepts as string[]) : [];
      for (const c of mc) conceptCounts[c] = (conceptCounts[c] ?? 0) + 1;
    }
    return {
      id: s.id,
      fullName: s.full_name ?? '—',
      hasViewed: !!view,
      viewCount: view?.count ?? 0,
      lastViewedAt: view?.last ?? null,
      totalQuestions: studentMessages.length,
      conceptQuestionCounts: conceptCounts,
      questions: studentMessages.map((m) => ({
        id: m.id,
        content: m.content,
        concepts: Array.isArray(m.concepts) ? (m.concepts as string[]) : [],
        createdAt: m.created_at,
      })),
    };
  });

  return {
    lessonId,
    title: typedLesson.title,
    concepts,
    students: studentResults,
  };
}

// Used by TeacherDashboard MiniHeatmap
export type MiniLessonRow = {
  lessonId: string;
  title: string;
  topConceptName: string;
  topConceptQuestionCount: number;
  totalQuestions: number;
  studentsAsking: number;
  totalStudents: number;
};

export async function getRecentLessonInsightRows(
  schoolId: string,
  limit = 3,
): Promise<MiniLessonRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, recorded_at')
    .eq('school_id', schoolId)
    .eq('transcript_status', 'ready')
    .order('recorded_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  const rows: MiniLessonRow[] = [];
  for (const lesson of (lessons ?? []) as Array<{ id: string; title: string | null }>) {
    const insight = await getLessonInsight(lesson.id);
    if (!insight || insight.concepts.length === 0) continue;

    const conceptTotals: Record<string, number> = {};
    let totalQuestions = 0;
    const askingStudents = new Set<string>();
    for (const s of insight.students) {
      if (s.totalQuestions > 0) askingStudents.add(s.id);
      for (const [c, n] of Object.entries(s.conceptQuestionCounts)) {
        conceptTotals[c] = (conceptTotals[c] ?? 0) + n;
        totalQuestions += n;
      }
    }
    const sortedConcepts = Object.entries(conceptTotals).sort(([, a], [, b]) => b - a);
    const [topConcept, topCount] = sortedConcepts[0] ?? ['—', 0];

    rows.push({
      lessonId: lesson.id,
      title: lesson.title ?? '—',
      topConceptName: topConcept,
      topConceptQuestionCount: topCount,
      totalQuestions,
      studentsAsking: askingStudents.size,
      totalStudents: insight.students.length,
    });
  }

  return rows;
}

// Helper för status-filter på lektionslistan
export async function getLessonStatusCounts(
  schoolId: string,
): Promise<Record<'all' | 'ready' | 'processing' | 'pending' | 'failed', number>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('lessons')
    .select('transcript_status')
    .eq('school_id', schoolId);
  const counts = { all: 0, ready: 0, processing: 0, pending: 0, failed: 0 };
  for (const row of (data ?? []) as Array<{ transcript_status: string }>) {
    counts.all += 1;
    const s = row.transcript_status as keyof typeof counts;
    if (s in counts) counts[s] += 1;
  }
  return counts;
}
