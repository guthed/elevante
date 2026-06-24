// Handskrivna typer för Elevante. Tabellerna bor i `public`-schemat i det
// dedikerade Supabase-projektet (msqfuywpbrteyrzjggsw, eu-central-2).
// Vi håller dessa synkade manuellt med migrationerna i supabase/migrations/.

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
  audio_path: string | null;
  audio_duration_seconds: number | null;
  summary: string | null;
  suggested_questions: string[];
  ai_generated_topic: string | null;
  concepts: string[];
  archived_at: string | null;
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
export type ChatScope = 'lesson' | 'course' | 'selection';

export type Chat = {
  id: string;
  school_id: string;
  user_id: string;
  scope: ChatScope;
  course_id: string | null;
  lesson_id: string | null;
  lesson_ids: string[] | null;
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
  concepts: string[];
  created_at: string;
};

export type LessonView = {
  lesson_id: string;
  profile_id: string;
  first_viewed_at: string;
  last_viewed_at: string;
  view_count: number;
};

type LessonViewInsert = {
  lesson_id: string;
  profile_id: string;
  first_viewed_at?: string;
  last_viewed_at?: string;
  view_count?: number;
};

export type PracticeQuestionType =
  | 'multiple_choice'
  | 'short_answer'
  | 'open'
  | 'reasoning';

export type PracticeQuestion = {
  id: string;
  type: PracticeQuestionType;
  prompt: string;
  lesson_id: string;
  options: string[] | null;
  correct_index: number | null;
  answer_key: string;
  max_points: number;
};

export type PracticeAnswer = {
  question_id: string;
  answer: string;
  points: number;
  max_points: number;
  correct: boolean | null;
  feedback: string;
};

export type PracticeSubmission = {
  answers: PracticeAnswer[];
  overall_feedback: string;
};

export type PracticeTest = {
  id: string;
  school_id: string;
  user_id: string;
  course_id: string;
  lesson_ids: string[];
  status: 'generated' | 'graded';
  questions: PracticeQuestion[];
  submission: PracticeSubmission | null;
  score: number | null;
  max_score: number;
  shared_with_teacher: boolean;
  shared_at: string | null;
  created_at: string;
  submitted_at: string | null;
};

type PracticeTestInsert = {
  school_id: string;
  user_id: string;
  course_id: string;
  lesson_ids: string[];
  status?: 'generated' | 'graded';
  questions?: PracticeQuestion[];
  submission?: PracticeSubmission | null;
  score?: number | null;
  max_score?: number;
  shared_with_teacher?: boolean;
  shared_at?: string | null;
  id?: string;
  created_at?: string;
  submitted_at?: string | null;
};

// --- Klassprov (lärar-författade prov tilldelade en klass) ---

export type TestComposition = {
  closed: number; // multiple_choice
  open: number; // short_answer + open
  reasoning: number; // reasoning
};

export type ClassTestStatus = 'draft' | 'published' | 'closed';

export type ClassTest = {
  id: string;
  school_id: string;
  class_id: string;
  created_by: string;
  title: string;
  lesson_ids: string[];
  composition: TestComposition;
  questions: PracticeQuestion[];
  max_score: number;
  status: ClassTestStatus;
  created_at: string;
  published_at: string | null;
};

type ClassTestInsert = {
  school_id: string;
  class_id: string;
  created_by: string;
  title: string;
  lesson_ids: string[];
  composition: TestComposition;
  questions?: PracticeQuestion[];
  max_score?: number;
  status?: ClassTestStatus;
  published_at?: string | null;
  id?: string;
  created_at?: string;
};

// Elevens svar: PracticeAnswer + bevarad AI-bedömning (lärar-justerbar feedback).
export type ClassTestAnswer = PracticeAnswer & {
  ai_points: number;
  ai_feedback: string;
};

export type ClassTestSubmissionStatus = 'graded' | 'released';

export type ClassTestSubmission = {
  id: string;
  class_test_id: string;
  school_id: string;
  student_id: string;
  answers: ClassTestAnswer[];
  score: number;
  max_score: number;
  overall_feedback: string;
  status: ClassTestSubmissionStatus;
  submitted_at: string;
  graded_at: string | null;
  released_at: string | null;
};

// Facit-strippad fråga som eleven ser (från get_published_class_test).
export type StudentClassTestQuestion = Omit<
  PracticeQuestion,
  'answer_key' | 'correct_index'
>;

export type PublishedClassTestForStudent = {
  id: string;
  title: string;
  class_id: string;
  max_score: number;
  questions: StudentClassTestQuestion[];
};

export type MySubmissionResult = {
  id: string;
  class_test_id: string;
  answers: ClassTestAnswer[];
  score: number;
  max_score: number;
  overall_feedback: string;
  released_at: string;
};

export type LearnerProfile = {
  profile_id: string;
  school_id: string;
  strengths: string[];
  growth_areas: string[];
  summary: string;
  tests_analyzed: number;
  updated_at: string;
};

type LearnerProfileInsert = {
  profile_id: string;
  school_id: string;
  strengths?: string[];
  growth_areas?: string[];
  summary?: string;
  tests_analyzed?: number;
  updated_at?: string;
};

// Kampanj: prisförfrågningar (rå logg) — globalt, ej school-scoped.
export type SchoolLookup = {
  id: string;
  created_at: string;
  school_unit_code: string;
  school_name: string;
  students: number | null;
  price_sek: number | null;
  locale: string;
  lead_email: string | null;
  lead_message: string | null;
};

type SchoolLookupInsert = {
  school_unit_code: string;
  school_name: string;
  locale: string;
  students?: number | null;
  price_sek?: number | null;
  lead_email?: string | null;
  lead_message?: string | null;
  id?: string;
  created_at?: string;
};

// Kampanj: anrikade skol-prospekt — deduplicerade, ett per school_unit_code.
export type SchoolProspect = {
  id: string;
  created_at: string;
  updated_at: string;
  school_unit_code: string;
  school_name: string;
  contact_address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_web: string | null;
  municipality: string | null;
  principal_type: string | null;
  huvudman_name: string | null;
  school_orientation: string | null;
  students: number | null;
  ai_brief: string | null;
  enrichment_status: 'pending' | 'done' | 'failed';
  first_seen_at: string;
  last_seen_at: string;
  lookup_count: number;
  latest_lead_email: string | null;
  latest_lead_message: string | null;
  latest_lead_at: string | null;
  notion_page_id: string | null;
};

type SchoolProspectInsert = {
  school_unit_code: string;
  school_name: string;
  contact_address?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_web?: string | null;
  municipality?: string | null;
  principal_type?: string | null;
  huvudman_name?: string | null;
  school_orientation?: string | null;
  students?: number | null;
  ai_brief?: string | null;
  enrichment_status?: 'pending' | 'done' | 'failed';
  first_seen_at?: string;
  last_seen_at?: string;
  lookup_count?: number;
  latest_lead_email?: string | null;
  latest_lead_message?: string | null;
  latest_lead_at?: string | null;
  notion_page_id?: string | null;
  id?: string;
  created_at?: string;
  updated_at?: string;
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
  audio_path?: string | null;
  audio_duration_seconds?: number | null;
  summary?: string | null;
  suggested_questions?: string[];
  ai_generated_topic?: string | null;
  concepts?: string[];
  archived_at?: string | null;
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
  lesson_ids?: string[] | null;
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
  concepts?: string[];
  id?: string;
  created_at?: string;
};

export type Database = {
  public: {
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
      lesson_views: TableDef<LessonView, LessonViewInsert>;
      practice_tests: TableDef<PracticeTest, PracticeTestInsert>;
      class_tests: TableDef<ClassTest, ClassTestInsert>;
      learner_profiles: TableDef<LearnerProfile, LearnerProfileInsert>;
      school_lookups: TableDef<SchoolLookup, SchoolLookupInsert>;
      school_prospects: TableDef<SchoolProspect, SchoolProspectInsert>;
    };
    Views: Record<string, never>;
    // RPC:erna match_lesson_chunks och match_course_chunks finns i schemat
    // men vi castar dem manuellt i app/actions/chat.ts. Att deklarera dem
    // här triggar Supabase JS att kräva fullständiga Relationships på alla
    // tabeller, vilket vi inte vill göra för hand.
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      day_of_week: DayOfWeek;
      chat_role: ChatRole;
      chat_scope: ChatScope;
    };
    CompositeTypes: Record<string, never>;
  };
};
