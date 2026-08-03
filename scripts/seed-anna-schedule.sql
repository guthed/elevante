-- Seed: veckoschema för läraren Anna Andersson.
--
-- Används av lärarvyn på webben (/teacher, GET /api/schedule) och för
-- att dema mobilappen (schemaskärmen visar dagens lektioner).
--
-- Kör en gång via Supabase MCP execute_sql. Idempotent — kan köras om
-- utan dubbletter (kurser/kopplingar via ON CONFLICT, timeslots rensas
-- och byggs om för Anna).
--
-- Anna Andersson (teacher): 7b11e203-1a8f-4cbe-adc2-c8263e1cece9
-- Elevante Demo Gymnasium:  01f56fd5-bb94-49ff-a457-f335731da003
-- Klass NA1A:               9b5f3f66-7318-4df7-8698-54a043317844

do $$
declare
  v_school uuid := '01f56fd5-bb94-49ff-a457-f335731da003';
  v_class  uuid := '9b5f3f66-7318-4df7-8698-54a043317844';
  v_anna   uuid := '7b11e203-1a8f-4cbe-adc2-c8263e1cece9';
  v_bio1 uuid;
  v_bio2 uuid;
  v_nk1b uuid;
begin
  -- Lägg till två kurser så schemat får variation (BIO1 finns redan).
  insert into public.courses (school_id, code, name) values
    (v_school, 'BIO2', 'Biologi 2 — Cellbiologi'),
    (v_school, 'NK1B', 'Naturkunskap 1b')
  on conflict (school_id, code) do nothing;

  select id into v_bio1 from public.courses where school_id = v_school and code = 'BIO1';
  select id into v_bio2 from public.courses where school_id = v_school and code = 'BIO2';
  select id into v_nk1b from public.courses where school_id = v_school and code = 'NK1B';

  -- Anna undervisar alla tre kurserna.
  insert into public.course_teachers (course_id, profile_id) values
    (v_bio1, v_anna), (v_bio2, v_anna), (v_nk1b, v_anna)
  on conflict do nothing;

  -- Bygg om Annas veckoschema från grunden.
  delete from public.timeslots where teacher_id = v_anna;

  insert into public.timeslots
    (school_id, course_id, class_id, teacher_id, day, start_time, end_time, room, valid_from) values
    (v_school, v_bio1, v_class, v_anna, 'monday',    '08:15', '09:45', 'Sal A2', '2026-01-07'),
    (v_school, v_nk1b, v_class, v_anna, 'tuesday',   '10:00', '11:30', 'Sal A2', '2026-01-07'),
    (v_school, v_bio2, v_class, v_anna, 'wednesday', '13:00', '14:30', 'Lab 1',  '2026-01-07'),
    (v_school, v_bio1, v_class, v_anna, 'thursday',  '09:00', '10:30', 'Sal A2', '2026-01-07'),
    (v_school, v_bio2, v_class, v_anna, 'friday',    '10:15', '11:45', 'Lab 1',  '2026-01-07'),
    (v_school, v_nk1b, v_class, v_anna, 'friday',    '13:00', '14:00', 'Sal A2', '2026-01-07');
end $$;
