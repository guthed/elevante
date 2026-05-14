-- Engångs-seed för lärarvyns insikt-demo.
--
-- Kör i två steg via Supabase MCP execute_sql:
--   1. STEG 1: Skapa 7 nya demo-elever (auth.users + auth.identities)
--   2. STEG 2: Länka dem till skolan + klassen
--   3. STEG 3: Skapa lesson_views för alla utom Sara
--   4. STEG 4: Skapa chats + chat_messages med koncept-taggar
--
-- Alla elever får lösenord ElevanteDemo2026!
-- Ekologi-lektionens id: ee64b8e0-6f68-48b3-bb4a-0ac1c233c262
-- NA1A klass-id: 9b5f3f66-7318-4df7-8698-54a043317844
-- School-id: 01f56fd5-bb94-49ff-a457-f335731da003

-- ============================================================
-- STEG 1: Skapa 7 nya elever
-- ============================================================

WITH new_users AS (
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    email,
    crypt('ElevanteDemo2026!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', full_name),
    now(), now(),
    '', '', '', ''
  FROM (VALUES
    ('oskar@demo.elevante.se', 'Oskar Lindberg'),
    ('maja@demo.elevante.se', 'Maja Karlsson'),
    ('lukas@demo.elevante.se', 'Lukas Persson'),
    ('sara@demo.elevante.se', 'Sara Svensson'),
    ('mira@demo.elevante.se', 'Mira Holm'),
    ('theo@demo.elevante.se', 'Theo Eriksson'),
    ('alma@demo.elevante.se', 'Alma Nyström')
  ) AS v(email, full_name)
  RETURNING id, email
)
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT
  gen_random_uuid(), id, id::text,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', now(), now(), now()
FROM new_users;

-- ============================================================
-- STEG 2: Länka eleverna till demo-skolan + klassen NA1A
-- ============================================================

UPDATE public.profiles
SET school_id = '01f56fd5-bb94-49ff-a457-f335731da003'
WHERE email IN (
  'oskar@demo.elevante.se', 'maja@demo.elevante.se', 'lukas@demo.elevante.se',
  'sara@demo.elevante.se', 'mira@demo.elevante.se', 'theo@demo.elevante.se',
  'alma@demo.elevante.se'
);

INSERT INTO public.class_members (class_id, profile_id)
SELECT '9b5f3f66-7318-4df7-8698-54a043317844', p.id
FROM public.profiles p
WHERE p.email IN (
  'oskar@demo.elevante.se', 'maja@demo.elevante.se', 'lukas@demo.elevante.se',
  'sara@demo.elevante.se', 'mira@demo.elevante.se', 'theo@demo.elevante.se',
  'alma@demo.elevante.se'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEG 3: Lesson_views (Sara hoppas över helt)
-- ============================================================

INSERT INTO public.lesson_views (lesson_id, profile_id, view_count)
SELECT
  'ee64b8e0-6f68-48b3-bb4a-0ac1c233c262',
  p.id,
  CASE p.email
    WHEN 'theo@demo.elevante.se' THEN 1
    WHEN 'elin@demo.elevante.se' THEN 4
    WHEN 'oskar@demo.elevante.se' THEN 3
    WHEN 'maja@demo.elevante.se' THEN 3
    WHEN 'lukas@demo.elevante.se' THEN 2
    WHEN 'mira@demo.elevante.se' THEN 4
    WHEN 'alma@demo.elevante.se' THEN 3
    ELSE 1
  END
FROM public.profiles p
WHERE p.email IN (
  'elin@demo.elevante.se', 'oskar@demo.elevante.se', 'maja@demo.elevante.se',
  'lukas@demo.elevante.se', 'mira@demo.elevante.se', 'theo@demo.elevante.se',
  'alma@demo.elevante.se'
)
ON CONFLICT (lesson_id, profile_id) DO NOTHING;

-- ============================================================
-- STEG 4: Demo-chats + koncept-taggade user-messages
-- ============================================================

DO $$
DECLARE
  v_school_id uuid := '01f56fd5-bb94-49ff-a457-f335731da003';
  v_lesson_id uuid := 'ee64b8e0-6f68-48b3-bb4a-0ac1c233c262';
  v_elin uuid;
  v_oskar uuid;
  v_maja uuid;
  v_lukas uuid;
  v_mira uuid;
  v_alma uuid;
  v_chat_id uuid;
BEGIN
  SELECT id INTO v_elin FROM public.profiles WHERE email = 'elin@demo.elevante.se';
  SELECT id INTO v_oskar FROM public.profiles WHERE email = 'oskar@demo.elevante.se';
  SELECT id INTO v_maja FROM public.profiles WHERE email = 'maja@demo.elevante.se';
  SELECT id INTO v_lukas FROM public.profiles WHERE email = 'lukas@demo.elevante.se';
  SELECT id INTO v_mira FROM public.profiles WHERE email = 'mira@demo.elevante.se';
  SELECT id INTO v_alma FROM public.profiles WHERE email = 'alma@demo.elevante.se';

  -- Elin: fastnar på näringspyramid
  INSERT INTO public.chats (school_id, user_id, scope, lesson_id, title)
  VALUES (v_school_id, v_elin, 'lesson', v_lesson_id, 'Förklara skillnaden mellan biotiska och...')
  RETURNING id INTO v_chat_id;
  INSERT INTO public.chat_messages (chat_id, role, content, concepts, created_at) VALUES
    (v_chat_id, 'user', 'Förklara skillnaden mellan biotiska och abiotiska faktorer', '["Biotiska faktorer", "Abiotiska faktorer"]'::jsonb, now() - interval '4 hours'),
    (v_chat_id, 'user', 'Men hur räknar man trofinivåerna då?', '["Trofinivåer", "Näringspyramid"]'::jsonb, now() - interval '3 hours 50 min'),
    (v_chat_id, 'user', 'Varför just 5 nivåer på land?', '["Näringspyramid", "Trofinivåer"]'::jsonb, now() - interval '3 hours 45 min');

  -- Oskar: energi-fokus
  INSERT INTO public.chats (school_id, user_id, scope, lesson_id, title)
  VALUES (v_school_id, v_oskar, 'lesson', v_lesson_id, 'Vad är trofinivåerna mer exakt?')
  RETURNING id INTO v_chat_id;
  INSERT INTO public.chat_messages (chat_id, role, content, concepts, created_at) VALUES
    (v_chat_id, 'user', 'Vad är trofinivåerna mer exakt?', '["Trofinivåer"]'::jsonb, now() - interval '6 hours'),
    (v_chat_id, 'user', 'Hur mycket energi förloras egentligen mellan nivåerna?', '["Energiflöde", "Trofinivåer"]'::jsonb, now() - interval '5 hours 50 min'),
    (v_chat_id, 'user', 'Är energiförlusten konstant?', '["Energiflöde"]'::jsonb, now() - interval '5 hours 45 min');

  -- Maja: fastnar på näring
  INSERT INTO public.chats (school_id, user_id, scope, lesson_id, title)
  VALUES (v_school_id, v_maja, 'lesson', v_lesson_id, 'Kan du förklara näringspyramiden?')
  RETURNING id INTO v_chat_id;
  INSERT INTO public.chat_messages (chat_id, role, content, concepts, created_at) VALUES
    (v_chat_id, 'user', 'Kan du förklara näringspyramiden med ett annat exempel?', '["Näringspyramid"]'::jsonb, now() - interval '8 hours'),
    (v_chat_id, 'user', 'Vad betyder biotiska faktorer i praktiken?', '["Biotiska faktorer"]'::jsonb, now() - interval '7 hours 50 min'),
    (v_chat_id, 'user', 'Hur räknar man var i pyramiden en organism är?', '["Näringspyramid", "Trofinivåer"]'::jsonb, now() - interval '7 hours 45 min');

  -- Lukas: energi
  INSERT INTO public.chats (school_id, user_id, scope, lesson_id, title)
  VALUES (v_school_id, v_lukas, 'lesson', v_lesson_id, 'Hur fungerar energiflödet?')
  RETURNING id INTO v_chat_id;
  INSERT INTO public.chat_messages (chat_id, role, content, concepts, created_at) VALUES
    (v_chat_id, 'user', 'Hur fungerar energiflödet mer detaljerat?', '["Energiflöde"]'::jsonb, now() - interval '10 hours'),
    (v_chat_id, 'user', 'Var i kedjan försvinner energin?', '["Energiflöde", "Trofinivåer"]'::jsonb, now() - interval '9 hours 50 min');

  -- Mira: bred
  INSERT INTO public.chats (school_id, user_id, scope, lesson_id, title)
  VALUES (v_school_id, v_mira, 'lesson', v_lesson_id, 'Vad menas med övergödning?')
  RETURNING id INTO v_chat_id;
  INSERT INTO public.chat_messages (chat_id, role, content, concepts, created_at) VALUES
    (v_chat_id, 'user', 'Vad menas med övergödning?', '["Övergödning"]'::jsonb, now() - interval '12 hours'),
    (v_chat_id, 'user', 'Hur påverkas Östersjön av övergödning?', '["Övergödning"]'::jsonb, now() - interval '11 hours 50 min'),
    (v_chat_id, 'user', 'Är abborren en konsument eller predator?', '["Producenter och konsumenter"]'::jsonb, now() - interval '11 hours 45 min'),
    (v_chat_id, 'user', 'Förklara biotiska faktorer igen tack', '["Biotiska faktorer"]'::jsonb, now() - interval '11 hours 40 min');

  -- Alma: engagerad
  INSERT INTO public.chats (school_id, user_id, scope, lesson_id, title)
  VALUES (v_school_id, v_alma, 'lesson', v_lesson_id, 'Kan du förklara hur näringspyramiden skiljer sig?')
  RETURNING id INTO v_chat_id;
  INSERT INTO public.chat_messages (chat_id, role, content, concepts, created_at) VALUES
    (v_chat_id, 'user', 'Kan du förklara hur näringspyramiden skiljer sig från näringskedjan?', '["Näringspyramid"]'::jsonb, now() - interval '14 hours'),
    (v_chat_id, 'user', 'Hur har människan påverkat Östersjöns ekosystem?', '["Övergödning", "Ekosystem"]'::jsonb, now() - interval '13 hours 50 min'),
    (v_chat_id, 'user', 'Vad spelar nedbrytarna för roll?', '["Producenter och konsumenter"]'::jsonb, now() - interval '13 hours 45 min');
END $$;
