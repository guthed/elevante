import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  ClassTest,
  ClassTestSubmission,
  MySubmissionResult,
  PublishedClassTestForStudent,
} from '@/lib/supabase/database';

export type ClassTestListRow = {
  id: string;
  title: string;
  status: ClassTest['status'];
  className: string | null;
  createdAt: string;
  submissionCount: number;
  pendingReviewCount: number; // status='graded' (ej släppta)
};

/** Lärarens klassprov-lista med inlämnings- och granskningsräknare. */
export async function getTeacherClassTests(): Promise<ClassTestListRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data: testRows } = await supabase
    .from('class_tests')
    .select('id, title, status, created_at, classes ( name )')
    .order('created_at', { ascending: false });

  type ClassTestJoin = {
    id: string;
    title: string;
    status: ClassTest['status'];
    created_at: string;
    classes: { name: string } | null;
  };
  const tests = (testRows ?? []) as ClassTestJoin[];
  if (tests.length === 0) return [];

  const ids = tests.map((t) => t.id);
  const { data: subRows } = await supabase
    .from('class_test_submissions')
    .select('class_test_id, status')
    .in('class_test_id', ids);
  const subs = (subRows ?? []) as { class_test_id: string; status: string }[];

  const total = new Map<string, number>();
  const pending = new Map<string, number>();
  for (const s of subs) {
    total.set(s.class_test_id, (total.get(s.class_test_id) ?? 0) + 1);
    if (s.status === 'graded') {
      pending.set(s.class_test_id, (pending.get(s.class_test_id) ?? 0) + 1);
    }
  }

  return tests.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    className: t.classes?.name ?? null,
    createdAt: t.created_at,
    submissionCount: total.get(t.id) ?? 0,
    pendingReviewCount: pending.get(t.id) ?? 0,
  }));
}

/** Ett klassprov för lärarvyn (full data inkl. facit). */
export async function getClassTestForTeacher(
  testId: string,
): Promise<ClassTest | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('class_tests')
    .select('*')
    .eq('id', testId)
    .maybeSingle();
  return (data as ClassTest | null) ?? null;
}

export type SubmissionListRow = {
  id: string;
  studentName: string | null;
  score: number;
  maxScore: number;
  status: ClassTestSubmission['status'];
  submittedAt: string;
};

export type NotStartedStudent = { id: string; name: string | null };

export type ClassTestSubmissionsView = {
  submitted: SubmissionListRow[];
  notStarted: NotStartedStudent[];
};

/** Inlämningar + elever som inte börjat, för lärarens översikt. */
export async function getClassTestSubmissions(
  test: ClassTest,
): Promise<ClassTestSubmissionsView> {
  const supabase = await createSupabaseServerClient();

  type SubmissionJoin = {
    id: string;
    student_id: string;
    score: number;
    max_score: number;
    status: ClassTestSubmission['status'];
    submitted_at: string;
    profiles: { full_name: string | null } | null;
  };
  const { data: subRows } = await supabase
    .from('class_test_submissions')
    .select('id, student_id, score, max_score, status, submitted_at, profiles ( full_name )')
    .eq('class_test_id', test.id)
    .order('submitted_at', { ascending: false });
  const subs = (subRows ?? []) as SubmissionJoin[];

  type MemberJoin = {
    profile_id: string;
    profiles: { full_name: string | null } | null;
  };
  const { data: memberRows } = await supabase
    .from('class_members')
    .select('profile_id, profiles ( full_name )')
    .eq('class_id', test.class_id);
  const members = (memberRows ?? []) as MemberJoin[];

  const submittedIds = new Set(subs.map((s) => s.student_id));
  return {
    submitted: subs.map((s) => ({
      id: s.id,
      studentName: s.profiles?.full_name ?? null,
      score: s.score,
      maxScore: s.max_score,
      status: s.status,
      submittedAt: s.submitted_at,
    })),
    notStarted: members
      .filter((m) => !submittedIds.has(m.profile_id))
      .map((m) => ({ id: m.profile_id, name: m.profiles?.full_name ?? null })),
  };
}

/** En inlämning för lärarens granskningsvy (full data). */
export async function getSubmissionForTeacher(
  submissionId: string,
): Promise<ClassTestSubmission | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('class_test_submissions')
    .select('*')
    .eq('id', submissionId)
    .maybeSingle();
  return (data as ClassTestSubmission | null) ?? null;
}

// --- Elev-läsning (via RPC) ---

export type StudentClassTestRow = {
  testId: string;
  title: string;
  className: string | null;
  status: ClassTest['status'];
  submissionId: string | null;
  submissionStatus: ClassTestSubmission['status'] | null;
};

/** Elevens klassprov-lista: publicerade prov i elevens klasser + ev. inlämning. */
export async function getStudentClassTests(
  studentId: string,
): Promise<StudentClassTestRow[]> {
  const supabase = await createSupabaseServerClient();

  // Elever saknar direkt SELECT på class_tests → läs via security-definer-RPC
  // (returnerar inget facit).
  const rpc = supabase as unknown as {
    rpc: (
      fn: string,
      args?: Record<string, unknown>,
    ) => Promise<{
      data:
        | {
            id: string;
            title: string;
            status: ClassTest['status'];
            class_name: string | null;
            published_at: string | null;
          }[]
        | null;
    }>;
  };
  const { data: testData } = await rpc.rpc('list_student_class_tests');
  const tests = testData ?? [];
  if (tests.length === 0) return [];

  const { data: subRows } = await supabase
    .from('class_test_submissions')
    .select('id, class_test_id, status')
    .eq('student_id', studentId)
    .in(
      'class_test_id',
      tests.map((t) => t.id),
    );
  const subByTest = new Map(
    ((subRows ?? []) as {
      id: string;
      class_test_id: string;
      status: ClassTestSubmission['status'];
    }[]).map((s) => [s.class_test_id, s]),
  );

  return tests.map((t) => {
    const sub = subByTest.get(t.id);
    return {
      testId: t.id,
      title: t.title,
      className: t.class_name,
      status: t.status,
      submissionId: sub?.id ?? null,
      submissionStatus: sub?.status ?? null,
    };
  });
}

/** Facit-strippat prov för eleven (via RPC). */
export async function getPublishedClassTest(
  testId: string,
): Promise<PublishedClassTestForStudent | null> {
  const supabase = await createSupabaseServerClient();
  const rpc = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: PublishedClassTestForStudent | null }>;
  };
  const { data } = await rpc.rpc('get_published_class_test', {
    p_test_id: testId,
  });
  return data ?? null;
}

/** Elevens släppta resultat (via RPC; null om ej släppt). */
export async function getMySubmissionResult(
  submissionId: string,
): Promise<MySubmissionResult | null> {
  const supabase = await createSupabaseServerClient();
  const rpc = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: MySubmissionResult | null }>;
  };
  const { data } = await rpc.rpc('get_my_submission_result', {
    p_submission_id: submissionId,
  });
  return data ?? null;
}
