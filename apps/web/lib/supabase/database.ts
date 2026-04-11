// Handskrivna typer för elevante-schemat.
// Automatisk generering via Supabase CLI returnerar bara public-schemat
// i Bokmassan-databasen, så vi håller dessa synkade manuellt med
// migrationerna tills vi flyttar till ett eget projekt.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'student' | 'teacher' | 'admin';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type TranscriptStatus = 'pending' | 'processing' | 'ready' | 'failed';

export type School = {
  id: string;
  name: string;
  slug: string;
  country: string;
  created_at: string;
};

export type Profile = {
  id: string;
  school_id: string | null;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type Course = {
  id: string;
  school_id: string;
  code: string;
  name: string;
  created_at: string;
};

export type Class = {
  id: string;
  school_id: string;
  name: string;
  year: number | null;
  created_at: string;
};

export type Timeslot = {
  id: string;
  school_id: string;
  course_id: string;
  class_id: string;
  teacher_id: string | null;
  day: DayOfWeek;
  start_time: string;
  end_time: string;
  room: string | null;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
};

export type Lesson = {
  id: string;
  school_id: string;
  course_id: string;
  class_id: string;
  teacher_id: string | null;
  timeslot_id: string | null;
  title: string | null;
  recorded_at: string | null;
  transcript_status: TranscriptStatus;
  transcript_text: string | null;
  transcript_updated_at: string | null;
  created_at: string;
};

export type Material = {
  id: string;
  lesson_id: string;
  school_id: string;
  uploaded_by: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type ChatRole = 'user' | 'assistant';
export type ChatScope = 'lesson' | 'course';

export type Chat = {
  id: string;
  school_id: string;
  user_id: string;
  scope: ChatScope;
  course_id: string | null;
  lesson_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatSource = {
  lesson_id: string;
  lesson_title: string | null;
  excerpt: string;
};

export type ChatMessage = {
  id: string;
  chat_id: string;
  role: ChatRole;
  content: string;
  sources: ChatSource[];
  created_at: string;
};

type TableDef<R, I> = {
  Row: R;
  Insert: I;
  Update: Partial<I>;
  Relationships: [];
};

type SchoolInsert = {
  name: string;
  slug: string;
  country?: string;
  id?: string;
  created_at?: string;
};

type ProfileInsert = {
  id: string;
  school_id?: string | null;
  role?: UserRole;
  full_name?: string | null;
  email?: string | null;
};

type CourseInsert = {
  school_id: string;
  code: string;
  name: string;
  id?: string;
  created_at?: string;
};

type ClassInsert = {
  school_id: string;
  name: string;
  year?: number | null;
  id?: string;
  created_at?: string;
};

type TimeslotInsert = {
  school_id: string;
  course_id: string;
  class_id: string;
  day: DayOfWeek;
  start_time: string;
  end_time: string;
  teacher_id?: string | null;
  room?: string | null;
  valid_from?: string;
  valid_until?: string | null;
  id?: string;
  created_at?: string;
};

type LessonInsert = {
  school_id: string;
  course_id: string;
  class_id: string;
  teacher_id?: string | null;
  timeslot_id?: string | null;
  title?: string | null;
  recorded_at?: string | null;
  transcript_status?: TranscriptStatus;
  transcript_text?: string | null;
  transcript_updated_at?: string | null;
  id?: string;
  created_at?: string;
};

type MaterialInsert = {
  lesson_id: string;
  school_id: string;
  uploaded_by: string;
  name: string;
  storage_path: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  id?: string;
  created_at?: string;
};

type ChatInsert = {
  school_id: string;
  user_id: string;
  scope: ChatScope;
  course_id?: string | null;
  lesson_id?: string | null;
  title?: string | null;
  id?: string;
  created_at?: string;
  updated_at?: string;
};

type ChatMessageInsert = {
  chat_id: string;
  role: ChatRole;
  content: string;
  sources?: ChatSource[];
  id?: string;
  created_at?: string;
};

export type Database = {
  elevante: {
    Tables: {
      schools: TableDef<School, SchoolInsert>;
      profiles: TableDef<Profile, ProfileInsert>;
      courses: TableDef<Course, CourseInsert>;
      classes: TableDef<Class, ClassInsert>;
      timeslots: TableDef<Timeslot, TimeslotInsert>;
      lessons: TableDef<Lesson, LessonInsert>;
      materials: TableDef<Material, MaterialInsert>;
      chats: TableDef<Chat, ChatInsert>;
      chat_messages: TableDef<ChatMessage, ChatMessageInsert>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      day_of_week: DayOfWeek;
    };
    CompositeTypes: Record<string, never>;
  };
};
