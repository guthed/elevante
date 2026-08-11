import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import type { SchoolProspect, TranscriptStatus, UserRole } from '@/lib/supabase/database';

export type AdminOverview = {
  schoolsCount: number;
  studentsCount: number;
  teachersCount: number;
  lessonsCount: number;
  transcribedCount: number;
  recentLessons: {
    id: string;
    title: string | null;
    courseName: string | null;
    className: string | null;
    recordedAt: string | null;
    status: TranscriptStatus;
  }[];
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await createSupabaseServerClient();

  const [
    schoolsRes,
    profilesRes,
    lessonsRes,
    recentRes,
  ] = await Promise.all([
    supabase.from('schools').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id, role'),
    supabase.from('lessons').select('id, transcript_status').is('archived_at', null),
    supabase
      .from('lessons')
      .select(
        'id, title, recorded_at, transcript_status, courses ( name ), classes ( name )',
      )
      .is('archived_at', null)
      .order('recorded_at', { ascending: false, nullsFirst: false })
      .limit(8),
  ]);

  const profiles = (profilesRes.data ?? []) as { id: string; role: UserRole }[];
  const lessons = (lessonsRes.data ?? []) as {
    id: string;
    transcript_status: TranscriptStatus;
  }[];

  type RecentJoin = {
    id: string;
    title: string | null;
    recorded_at: string | null;
    transcript_status: TranscriptStatus;
    courses: { name: string } | null;
    classes: { name: string } | null;
  };

  const recentLessons = ((recentRes.data ?? []) as unknown as RecentJoin[]).map(
    (row) => ({
      id: row.id,
      title: row.title,
      courseName: row.courses?.name ?? null,
      className: row.classes?.name ?? null,
      recordedAt: row.recorded_at,
      status: row.transcript_status,
    }),
  );

  return {
    schoolsCount: schoolsRes.count ?? 0,
    studentsCount: profiles.filter((p) => p.role === 'student').length,
    teachersCount: profiles.filter((p) => p.role === 'teacher').length,
    lessonsCount: lessons.length,
    transcribedCount: lessons.filter((l) => l.transcript_status === 'ready').length,
    recentLessons,
  };
}

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  school_id: string | null;
};

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, school_id')
    .order('created_at', { ascending: false })
    .limit(200);
  return ((data ?? []) as AdminUserRow[]);
}

export type AdminSchoolRow = {
  id: string;
  name: string;
  slug: string;
  country: string;
  created_at: string;
  adminCount: number;
};

export async function getAdminSchools(): Promise<AdminSchoolRow[]> {
  const supabase = createSupabaseServiceRoleClient();
  const [schoolsRes, adminsRes] = await Promise.all([
    supabase
      .from('schools')
      .select('id, name, slug, country, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('school_id').eq('role', 'admin'),
  ]);

  const adminCounts = new Map<string, number>();
  for (const row of adminsRes.data ?? []) {
    if (!row.school_id) continue;
    adminCounts.set(row.school_id, (adminCounts.get(row.school_id) ?? 0) + 1);
  }

  return (schoolsRes.data ?? []).map((s) => ({
    ...s,
    adminCount: adminCounts.get(s.id) ?? 0,
  }));
}

export type AdminStats = {
  weeklyLessons: { day: string; count: number }[];
  statusBreakdown: { status: TranscriptStatus; count: number }[];
  totals: {
    students: number;
    teachers: number;
    admins: number;
  };
};

export type CampaignProspectsResult = {
  prospects: SchoolProspect[];
  total: number;
};

export async function getCampaignProspects(): Promise<CampaignProspectsResult> {
  const supabase = await createSupabaseServerClient();

  const [prospectsRes, countRes] = await Promise.all([
    supabase
      .from('school_prospects')
      .select(
        'id, school_unit_code, school_name, municipality, huvudman_name, students, ' +
        'lookup_count, ai_brief, enrichment_status, contact_address, contact_phone, ' +
        'contact_email, latest_lead_email, first_seen_at, last_seen_at, ' +
        'created_at, updated_at, contact_web, principal_type, school_orientation, ' +
        'latest_lead_message, latest_lead_at, notion_page_id',
      )
      .order('last_seen_at', { ascending: false })
      .limit(200),
    supabase
      .from('school_prospects')
      .select('id', { count: 'exact', head: true }),
  ]);

  return {
    prospects: ((prospectsRes.data ?? []) as unknown as SchoolProspect[]),
    total: countRes.count ?? 0,
  };
}

export type ProspectListItem = {
  code: string;
  name: string;
  municipality: string | null;
  students: number | null;
  skolform: string[] | null;
  syncStatus: string | null;
  lastSyncedAt: string | null;
  notionPageId: string | null;
  createdVia: string;
};

export async function getProspects(): Promise<ProspectListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('school_prospects')
    .select(
      'school_unit_code, school_name, municipality, students, skolform, sync_status, last_synced_at, notion_page_id, created_via',
    )
    .order('last_synced_at', { ascending: false, nullsFirst: false })
    .limit(200);
  return (data ?? []).map((r) => ({
    code: r.school_unit_code,
    name: r.school_name,
    municipality: r.municipality,
    students: r.students,
    skolform: r.skolform,
    syncStatus: r.sync_status,
    lastSyncedAt: r.last_synced_at,
    notionPageId: r.notion_page_id,
    createdVia: r.created_via,
  }));
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createSupabaseServerClient();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
  oneWeekAgo.setHours(0, 0, 0, 0);

  const [lessonsRes, profilesRes] = await Promise.all([
    supabase
      .from('lessons')
      .select('recorded_at, transcript_status')
      .is('archived_at', null)
      .gte('recorded_at', oneWeekAgo.toISOString()),
    supabase.from('profiles').select('role'),
  ]);

  const lessons = (lessonsRes.data ?? []) as {
    recorded_at: string | null;
    transcript_status: TranscriptStatus;
  }[];

  // Bygg 7-dagars-bucket
  const buckets = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }
  for (const lesson of lessons) {
    if (!lesson.recorded_at) continue;
    const key = lesson.recorded_at.slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  const statusCounts = new Map<TranscriptStatus, number>();
  for (const lesson of lessons) {
    statusCounts.set(
      lesson.transcript_status,
      (statusCounts.get(lesson.transcript_status) ?? 0) + 1,
    );
  }

  const profiles = (profilesRes.data ?? []) as { role: UserRole }[];

  return {
    weeklyLessons: Array.from(buckets.entries()).map(([day, count]) => ({
      day,
      count,
    })),
    statusBreakdown: (
      ['pending', 'processing', 'ready', 'failed'] as TranscriptStatus[]
    ).map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    })),
    totals: {
      students: profiles.filter((p) => p.role === 'student').length,
      teachers: profiles.filter((p) => p.role === 'teacher').length,
      admins: profiles.filter((p) => p.role === 'admin').length,
    },
  };
}

export type AdminClassRow = {
  id: string;
  name: string;
  year: number | null;
  studentsCount: number;
  lessonsCount: number;
};

export async function getAdminClasses(schoolId: string): Promise<AdminClassRow[]> {
  const supabase = await createSupabaseServerClient();
  const [classesRes, membersRes, lessonsRes] = await Promise.all([
    supabase.from('classes').select('id, name, year').eq('school_id', schoolId).order('name'),
    supabase.from('class_members').select('class_id'),
    supabase.from('lessons').select('class_id').eq('school_id', schoolId).is('archived_at', null),
  ]);

  const studentCounts = new Map<string, number>();
  for (const row of (membersRes.data ?? []) as { class_id: string }[]) {
    studentCounts.set(row.class_id, (studentCounts.get(row.class_id) ?? 0) + 1);
  }
  const lessonCounts = new Map<string, number>();
  for (const row of lessonsRes.data ?? []) {
    lessonCounts.set(row.class_id, (lessonCounts.get(row.class_id) ?? 0) + 1);
  }

  return (classesRes.data ?? []).map((c) => ({
    ...c,
    studentsCount: studentCounts.get(c.id) ?? 0,
    lessonsCount: lessonCounts.get(c.id) ?? 0,
  }));
}

export type AdminCourseTeacher = { id: string; fullName: string | null };

export type AdminCourseRow = {
  id: string;
  code: string;
  name: string;
  teachers: AdminCourseTeacher[];
};

export async function getAdminCourses(schoolId: string): Promise<AdminCourseRow[]> {
  const supabase = await createSupabaseServerClient();
  const [coursesRes, teachersRes] = await Promise.all([
    supabase.from('courses').select('id, code, name').eq('school_id', schoolId).order('code'),
    supabase.from('course_teachers').select('course_id, profiles ( id, full_name )'),
  ]);

  type TeacherJoin = {
    course_id: string;
    profiles: { id: string; full_name: string | null } | null;
  };
  const byCourse = new Map<string, AdminCourseTeacher[]>();
  for (const row of (teachersRes.data ?? []) as unknown as TeacherJoin[]) {
    if (!row.profiles) continue;
    const list = byCourse.get(row.course_id) ?? [];
    list.push({ id: row.profiles.id, fullName: row.profiles.full_name });
    byCourse.set(row.course_id, list);
  }

  return (coursesRes.data ?? []).map((c) => ({
    ...c,
    teachers: byCourse.get(c.id) ?? [],
  }));
}

export type AdminTeacherOption = { id: string; fullName: string | null; email: string | null };

export async function getSchoolTeachers(schoolId: string): Promise<AdminTeacherOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('school_id', schoolId)
    .eq('role', 'teacher')
    .order('full_name');
  return (data ?? []).map((p) => ({ id: p.id, fullName: p.full_name, email: p.email }));
}
