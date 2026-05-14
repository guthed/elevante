-- Elevante: initial schema for the dedicated Supabase project (eu-central-2).
-- Konsoliderar Fas 2–6 i en migration. Alla tabeller bor i `public`-schemat.
--
-- Notera: Postgres har en inbyggd `current_role()`-funktion, så vår
-- rollhjälpare heter `current_user_role()` för att undvika kollision.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('student', 'teacher', 'admin');

create type public.day_of_week as enum (
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
);

create type public.chat_role as enum ('user', 'assistant');
create type public.chat_scope as enum ('lesson', 'course');

-- ---------------------------------------------------------------------------
-- Tabeller
-- ---------------------------------------------------------------------------
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  country char(2) not null default 'SE',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  role public.user_role not null default 'student',
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_school_idx on public.profiles(school_id);
create index profiles_role_idx on public.profiles(role);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (school_id, code)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  year smallint,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

create table public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (class_id, profile_id)
);

create table public.course_teachers (
  course_id uuid not null references public.courses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (course_id, profile_id)
);

create table public.timeslots (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  day public.day_of_week not null,
  start_time time not null,
  end_time time not null,
  room text,
  valid_from date not null default current_date,
  valid_until date,
  created_at timestamptz not null default now()
);
create index timeslots_school_idx on public.timeslots(school_id);
create index timeslots_day_idx on public.timeslots(day);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  timeslot_id uuid references public.timeslots(id) on delete set null,
  title text,
  recorded_at timestamptz,
  transcript_status text not null default 'pending'
    check (transcript_status in ('pending', 'processing', 'ready', 'failed')),
  transcript_text text,
  transcript_updated_at timestamptz,
  audio_path text,
  audio_duration_seconds integer,
  created_at timestamptz not null default now()
);
create index lessons_class_idx on public.lessons(class_id);
create index lessons_course_idx on public.lessons(course_id);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete set null,
  name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
create index materials_lesson_idx on public.materials(lesson_id);
create index materials_school_idx on public.materials(school_id);

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope public.chat_scope not null,
  course_id uuid references public.courses(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope = 'lesson' and lesson_id is not null) or
    (scope = 'course' and course_id is not null)
  )
);
create index chats_user_idx on public.chats(user_id);
create index chats_lesson_idx on public.chats(lesson_id);
create index chats_course_idx on public.chats(course_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role public.chat_role not null,
  content text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index chat_messages_chat_idx on public.chat_messages(chat_id);

create table public.lesson_chunks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding extensions.vector(1024),
  start_seconds numeric,
  end_seconds numeric,
  created_at timestamptz not null default now(),
  unique (lesson_id, chunk_index)
);
create index lesson_chunks_lesson_idx on public.lesson_chunks(lesson_id);
create index lesson_chunks_school_idx on public.lesson_chunks(school_id);
create index lesson_chunks_embedding_idx
  on public.lesson_chunks
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

-- ---------------------------------------------------------------------------
-- Helper-funktioner
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select school_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger chats_touch_updated_at
before update on public.chats
for each row execute function public.touch_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.course_teachers enable row level security;
alter table public.timeslots enable row level security;
alter table public.lessons enable row level security;
alter table public.materials enable row level security;
alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;
alter table public.lesson_chunks enable row level security;

-- Schools
create policy "schools_select_own"
  on public.schools for select
  to authenticated
  using (id = public.current_school_id());

create policy "schools_admin_all"
  on public.schools for all
  to authenticated
  using (
    public.current_user_role() = 'admin'
    and id = public.current_school_id()
  )
  with check (
    public.current_user_role() = 'admin'
    and id = public.current_school_id()
  );

-- Profiles
create policy "profiles_select_same_school"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or school_id = public.current_school_id()
  );

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_admin_manage"
  on public.profiles for all
  to authenticated
  using (
    public.current_user_role() = 'admin'
    and school_id = public.current_school_id()
  )
  with check (
    public.current_user_role() = 'admin'
    and school_id = public.current_school_id()
  );

-- Courses
create policy "courses_select_same_school"
  on public.courses for select
  to authenticated
  using (school_id = public.current_school_id());

create policy "courses_admin_write"
  on public.courses for all
  to authenticated
  using (
    public.current_user_role() = 'admin'
    and school_id = public.current_school_id()
  )
  with check (
    public.current_user_role() = 'admin'
    and school_id = public.current_school_id()
  );

-- Classes
create policy "classes_select_same_school"
  on public.classes for select
  to authenticated
  using (school_id = public.current_school_id());

create policy "classes_admin_write"
  on public.classes for all
  to authenticated
  using (
    public.current_user_role() = 'admin'
    and school_id = public.current_school_id()
  )
  with check (
    public.current_user_role() = 'admin'
    and school_id = public.current_school_id()
  );

-- Class members
create policy "class_members_select_same_school"
  on public.class_members for select
  to authenticated
  using (
    exists (
      select 1 from public.classes c
      where c.id = class_members.class_id
        and c.school_id = public.current_school_id()
    )
  );

create policy "class_members_admin_write"
  on public.class_members for all
  to authenticated
  using (
    public.current_user_role() = 'admin'
    and exists (
      select 1 from public.classes c
      where c.id = class_members.class_id
        and c.school_id = public.current_school_id()
    )
  )
  with check (
    public.current_user_role() = 'admin'
    and exists (
      select 1 from public.classes c
      where c.id = class_members.class_id
        and c.school_id = public.current_school_id()
    )
  );

-- Course teachers
create policy "course_teachers_select_same_school"
  on public.course_teachers for select
  to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_teachers.course_id
        and c.school_id = public.current_school_id()
    )
  );

create policy "course_teachers_admin_write"
  on public.course_teachers for all
  to authenticated
  using (
    public.current_user_role() = 'admin'
    and exists (
      select 1 from public.courses c
      where c.id = course_teachers.course_id
        and c.school_id = public.current_school_id()
    )
  )
  with check (
    public.current_user_role() = 'admin'
    and exists (
      select 1 from public.courses c
      where c.id = course_teachers.course_id
        and c.school_id = public.current_school_id()
    )
  );

-- Timeslots
create policy "timeslots_select_same_school"
  on public.timeslots for select
  to authenticated
  using (school_id = public.current_school_id());

create policy "timeslots_admin_write"
  on public.timeslots for all
  to authenticated
  using (
    public.current_user_role() = 'admin'
    and school_id = public.current_school_id()
  )
  with check (
    public.current_user_role() = 'admin'
    and school_id = public.current_school_id()
  );

-- Lessons
create policy "lessons_select_same_school"
  on public.lessons for select
  to authenticated
  using (school_id = public.current_school_id());

create policy "lessons_teacher_write_own"
  on public.lessons for all
  to authenticated
  using (
    (teacher_id = auth.uid() or public.current_user_role() = 'admin')
    and school_id = public.current_school_id()
  )
  with check (
    (teacher_id = auth.uid() or public.current_user_role() = 'admin')
    and school_id = public.current_school_id()
  );

-- Materials
create policy "materials_select_same_school"
  on public.materials for select
  to authenticated
  using (school_id = public.current_school_id());

create policy "materials_teacher_write_own_lesson"
  on public.materials for insert
  to authenticated
  with check (
    school_id = public.current_school_id()
    and (
      public.current_user_role() = 'admin'
      or exists (
        select 1 from public.lessons l
        where l.id = materials.lesson_id
          and (l.teacher_id = auth.uid() or public.current_user_role() = 'admin')
      )
    )
  );

create policy "materials_teacher_delete_own"
  on public.materials for delete
  to authenticated
  using (
    school_id = public.current_school_id()
    and (uploaded_by = auth.uid() or public.current_user_role() = 'admin')
  );

-- Chats — strikt privacy: bara den egna användaren ser sina chats.
create policy "chats_self_select"
  on public.chats for select
  to authenticated
  using (user_id = auth.uid());

create policy "chats_self_insert"
  on public.chats for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and school_id = public.current_school_id()
  );

create policy "chats_self_update"
  on public.chats for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "chats_self_delete"
  on public.chats for delete
  to authenticated
  using (user_id = auth.uid());

create policy "chat_messages_self_select"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.chats c
      where c.id = chat_messages.chat_id and c.user_id = auth.uid()
    )
  );

create policy "chat_messages_self_insert"
  on public.chat_messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.chats c
      where c.id = chat_messages.chat_id and c.user_id = auth.uid()
    )
  );

-- Lesson chunks — bara läsning för authenticated; skrivning sker via service_role
-- i Edge Function-pipelinen.
create policy "lesson_chunks_select_same_school"
  on public.lesson_chunks for select
  to authenticated
  using (school_id = public.current_school_id());

-- ---------------------------------------------------------------------------
-- Storage-buckets + policies
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'elevante-materials',
  'elevante-materials',
  false,
  524288000, -- 500 MB
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'elevante-audio',
  'elevante-audio',
  false,
  2147483648, -- 2 GB
  array['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/mpeg']
)
on conflict (id) do nothing;

-- Materials: filer struktureras som <school_id>/<lesson_id>/<filename>.
create policy "elevante_materials_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'elevante-materials'
    and (storage.foldername(name))[1] = public.current_school_id()::text
  );

create policy "elevante_materials_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'elevante-materials'
    and (storage.foldername(name))[1] = public.current_school_id()::text
    and public.current_user_role() in ('teacher', 'admin')
  );

create policy "elevante_materials_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'elevante-materials'
    and (storage.foldername(name))[1] = public.current_school_id()::text
    and public.current_user_role() in ('teacher', 'admin')
  )
  with check (
    bucket_id = 'elevante-materials'
    and (storage.foldername(name))[1] = public.current_school_id()::text
    and public.current_user_role() in ('teacher', 'admin')
  );

create policy "elevante_materials_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'elevante-materials'
    and (storage.foldername(name))[1] = public.current_school_id()::text
    and public.current_user_role() in ('teacher', 'admin')
  );

-- Audio: extra känsligt — bara läraren/admin i samma skola.
create policy "elevante_audio_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'elevante-audio'
    and (storage.foldername(name))[1] = public.current_school_id()::text
    and public.current_user_role() in ('teacher', 'admin')
  );

create policy "elevante_audio_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'elevante-audio'
    and (storage.foldername(name))[1] = public.current_school_id()::text
    and public.current_user_role() in ('teacher', 'admin')
  );

create policy "elevante_audio_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'elevante-audio'
    and (storage.foldername(name))[1] = public.current_school_id()::text
    and public.current_user_role() in ('teacher', 'admin')
  )
  with check (
    bucket_id = 'elevante-audio'
    and (storage.foldername(name))[1] = public.current_school_id()::text
    and public.current_user_role() in ('teacher', 'admin')
  );

create policy "elevante_audio_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'elevante-audio'
    and (storage.foldername(name))[1] = public.current_school_id()::text
    and public.current_user_role() in ('teacher', 'admin')
  );

-- ---------------------------------------------------------------------------
-- RPC: vector-search för en specifik lektion respektive en hel kurs.
-- ---------------------------------------------------------------------------
create or replace function public.match_lesson_chunks(
  query_embedding extensions.vector(1024),
  lesson_id_filter uuid,
  top_k integer default 5
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.content,
    1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.lesson_chunks c
  where c.lesson_id = lesson_id_filter
    and c.embedding is not null
  order by c.embedding operator(extensions.<=>) query_embedding
  limit top_k;
$$;

create or replace function public.match_course_chunks(
  query_embedding extensions.vector(1024),
  course_id_filter uuid,
  top_k integer default 8
)
returns table (
  id uuid,
  lesson_id uuid,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.lesson_id,
    c.content,
    1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.lesson_chunks c
  join public.lessons l on l.id = c.lesson_id
  where l.course_id = course_id_filter
    and c.embedding is not null
  order by c.embedding operator(extensions.<=>) query_embedding
  limit top_k;
$$;

grant execute on function public.match_lesson_chunks(extensions.vector(1024), uuid, integer) to authenticated;
grant execute on function public.match_course_chunks(extensions.vector(1024), uuid, integer) to authenticated;
