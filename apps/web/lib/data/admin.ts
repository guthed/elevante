import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TranscriptStatus, UserRole } from '@/lib/supabase/database';

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
    supabase.from('lessons').select('id, transcript_status'),
    supabase
      .from('lessons')
      .select(
        'id, title, recorded_at, transcript_status, courses ( name ), classes ( name )',
      )
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
};

export async function getAdminSchools(): Promise<AdminSchoolRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('schools')
    .select('id, name, slug, country, created_at')
    .order('created_at', { ascending: false });
  return ((data ?? []) as AdminSchoolRow[]);
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

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createSupabaseServerClient();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
  oneWeekAgo.setHours(0, 0, 0, 0);

  const [lessonsRes, profilesRes] = await Promise.all([
    supabase
      .from('lessons')
      .select('recorded_at, transcript_status')
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
