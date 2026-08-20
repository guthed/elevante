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
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  is_staff: boolean;
};

export type Course = {
  id: string;
  school_id: string;
  code: string;
  name: string;
  created_at: string;
};

export type CourseTeacher = {
  course_id: string;
  profile_id: string;
};

export type ClassMember = {
  class_id: string;
  profile_id: string;
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

export type ClassTestSubmissionInsert = {
  class_test_id: string;
  school_id: string;
  student_id: string;
  answers?: ClassTestAnswer[];
  score?: number;
  max_score?: number;
  overall_feedback?: string;
  status?: ClassTestSubmissionStatus;
  submitted_at?: string;
  graded_at?: string | null;
  released_at?: string | null;
  id?: string;
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
  skolform: string[] | null;
  created_via: string;
  last_synced_at: string | null;
  sync_status: string | null;
  sync_error: string | null;
  contact_email_draft: string | null;
  visit_code: string | null;
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
  skolform?: string[] | null;
  created_via?: string;
  last_synced_at?: string | null;
  sync_status?: string | null;
  sync_error?: string | null;
  contact_email_draft?: string | null;
  visit_code?: string | null;
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// Skol-CRM: ops-logg för schemasynk mot Skolverkets API.
export type SchoolSyncLog = {
  id: string;
  synced_at: string;
  school_unit_code: string;
  status: string;
  duration_ms: number | null;
  error: string | null;
};

type SchoolSyncLogInsert = {
  school_unit_code: string;
  status: string;
  duration_ms?: number | null;
  error?: string | null;
  id?: string;
  synced_at?: string;
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
  avatar_url?: string | null;
  is_staff?: boolean;
};

type CourseInsert = {
  school_id: string;
  code: string;
  name: string;
  id?: string;
  created_at?: string;
};

type CourseTeacherInsert = {
  course_id: string;
  profile_id: string;
};

type ClassMemberInsert = {
  class_id: string;
  profile_id: string;
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

export type TryShare = {
  id: string;
  sender_name: string;
  sender_email: string;
  recipient_email: string;
  message: string | null;
  locale: string;
  ip: string | null;
  created_at: string;
};

type TryShareInsert = {
  sender_name: string;
  sender_email: string;
  recipient_email: string;
  message?: string | null;
  locale?: string;
  ip?: string | null;
  id?: string;
  created_at?: string;
};

// --- Kunskapsträning (Foundation) ---

export type TrainingConcept = {
  id: string;
  name: string;
  definition: string;
  example: string;
  misconception: string;
};

export type TrainingFlashcard = {
  id: string;
  concept_id: string;
  front: string;
  back: string;
};

export type TrainingKnowledgeCheck = {
  id: string;
  concept_id: string;
  question: string;
  choices: string[];
  correct_index: number;
  explanation: string;
};

export type TrainingMaterial = {
  id: string;
  school_id: string;
  lesson_id: string;
  concepts: TrainingConcept[];
  flashcards: TrainingFlashcard[];
  knowledge_checks: TrainingKnowledgeCheck[];
  model_version: string | null;
  generated_at: string;
};

type TrainingMaterialInsert = {
  school_id: string;
  lesson_id: string;
  concepts?: TrainingConcept[];
  flashcards?: TrainingFlashcard[];
  knowledge_checks?: TrainingKnowledgeCheck[];
  model_version?: string | null;
  id?: string;
  generated_at?: string;
};

export type FlashcardGrade = 'again' | 'hard' | 'good';

export type FlashcardReviewState = {
  id: string;
  student_id: string;
  school_id: string;
  lesson_id: string;
  flashcard_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_at: string;
  last_reviewed_at: string | null;
  last_grade: FlashcardGrade | null;
};

type FlashcardReviewStateInsert = {
  student_id: string;
  school_id: string;
  lesson_id: string;
  flashcard_id: string;
  ease_factor?: number;
  interval_days?: number;
  repetitions?: number;
  due_at?: string;
  last_reviewed_at?: string | null;
  last_grade?: FlashcardGrade | null;
  id?: string;
};

export type KnowledgeCheckAttempt = {
  id: string;
  student_id: string;
  school_id: string;
  lesson_id: string;
  knowledge_check_id: string;
  correct: boolean;
  answered_at: string;
};

type KnowledgeCheckAttemptInsert = {
  student_id: string;
  school_id: string;
  lesson_id: string;
  knowledge_check_id: string;
  correct: boolean;
  id?: string;
  answered_at?: string;
};

export type TrainingMode = 'flashcards' | 'knowledge_checks';

export type TrainingSession = {
  id: string;
  student_id: string;
  school_id: string;
  mode: TrainingMode;
  lesson_ids: string[];
  item_ids: string[];
  created_at: string;
};

type TrainingSessionInsert = {
  student_id: string;
  school_id: string;
  mode: TrainingMode;
  lesson_ids: string[];
  item_ids: string[];
  id?: string;
  created_at?: string;
};

export type FeedbackCategory = 'not_working' | 'confused' | 'looks_wrong';

/**
 * En elevrapport om appen. `context` är avsiktligt löst typad (Record) — den
 * växer med nya vyer, och läsare ska tåla saknade nycklar. Se
 * lib/feedback/context.ts för vad appen faktiskt bifogar idag.
 */
export type FeedbackReport = {
  id: string;
  school_id: string;
  student_id: string;
  category: FeedbackCategory;
  message: string | null;
  surface: string;
  lesson_id: string | null;
  context: Record<string, unknown>;
  notion_page_id: string | null;
  created_at: string;
};

type FeedbackReportInsert = {
  school_id: string;
  student_id: string;
  category: FeedbackCategory;
  surface: string;
  message?: string | null;
  lesson_id?: string | null;
  context?: Record<string, unknown>;
  notion_page_id?: string | null;
  id?: string;
  created_at?: string;
};

export type Database = {
  public: {
    Tables: {
      schools: TableDef<School, SchoolInsert>;
      profiles: TableDef<Profile, ProfileInsert>;
      courses: TableDef<Course, CourseInsert>;
      course_teachers: TableDef<CourseTeacher, CourseTeacherInsert>;
      classes: TableDef<Class, ClassInsert>;
      class_members: TableDef<ClassMember, ClassMemberInsert>;
      timeslots: TableDef<Timeslot, TimeslotInsert>;
      lessons: TableDef<Lesson, LessonInsert>;
      materials: TableDef<Material, MaterialInsert>;
      chats: TableDef<Chat, ChatInsert>;
      chat_messages: TableDef<ChatMessage, ChatMessageInsert>;
      lesson_views: TableDef<LessonView, LessonViewInsert>;
      practice_tests: TableDef<PracticeTest, PracticeTestInsert>;
      class_tests: TableDef<ClassTest, ClassTestInsert>;
      class_test_submissions: TableDef<ClassTestSubmission, ClassTestSubmissionInsert>;
      learner_profiles: TableDef<LearnerProfile, LearnerProfileInsert>;
      school_lookups: TableDef<SchoolLookup, SchoolLookupInsert>;
      school_prospects: TableDef<SchoolProspect, SchoolProspectInsert>;
      school_sync_log: TableDef<SchoolSyncLog, SchoolSyncLogInsert>;
      try_shares: TableDef<TryShare, TryShareInsert>;
      training_materials: TableDef<TrainingMaterial, TrainingMaterialInsert>;
      flashcard_review_state: TableDef<FlashcardReviewState, FlashcardReviewStateInsert>;
      knowledge_check_attempts: TableDef<KnowledgeCheckAttempt, KnowledgeCheckAttemptInsert>;
      training_sessions: TableDef<TrainingSession, TrainingSessionInsert>;
      feedback_reports: TableDef<FeedbackReport, FeedbackReportInsert>;
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
