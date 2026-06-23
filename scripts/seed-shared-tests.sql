-- Seed: delade övningsprov (DEMOSKOLAN, Biologi 1 — Ekologi)
-- 5 elever, varje prov spänner över 6 ekologilektioner, rättade och delade med läraren.
-- Idempotent: rensar tidigare seedade delade 6-lektionsprov först.

delete from practice_tests
where shared_with_teacher = true
  and course_id = '587edbc7-a9c7-4077-b1b8-b787e8d46c5e'
  and array_length(lesson_ids, 1) = 6;

with q as (
  select
    '[
      {"id":"q1","type":"multiple_choice","lesson_id":"a1de2ac5-3620-4555-89a8-5c1dafdc26fb","prompt":"Vad menas med en population i ekologi?","options":["Alla organismer i ett ekosystem","Individer av samma art inom samma omrade","Alla djur i en naringskedja","Samspelet mellan olika arter"],"correct_index":1,"answer_key":"Individer av samma art inom samma omrade vid samma tid.","max_points":1},
      {"id":"q2","type":"short_answer","lesson_id":"47c72283-2925-40ba-814b-fdca51580f81","prompt":"Forklara skillnaden mellan en naringskedja och en naringsvav.","options":null,"correct_index":null,"answer_key":"En naringskedja ar en linjar foljd av vem som ater vem. En naringsvav ar flera sammanlankade naringskedjor i ett ekosystem.","max_points":2},
      {"id":"q3","type":"multiple_choice","lesson_id":"9edc7125-0267-4f66-9ae8-42fd1c63e6b6","prompt":"Ungefar hur stor andel av energin fors vidare till nasta trofiniva?","options":["1 procent","10 procent","50 procent","90 procent"],"correct_index":1,"answer_key":"Cirka 10 procent, resten forloras framst som varme.","max_points":1},
      {"id":"q4","type":"short_answer","lesson_id":"a4a11781-fb29-4555-ad6a-9f946664141e","prompt":"Beskriv kvavets kretslopp kortfattat.","options":null,"correct_index":null,"answer_key":"Kvave fixeras fran luften av bakterier, tas upp av vaxter, vandrar genom naringskedjan och aterfors till marken och luften via nedbrytning och denitrifikation.","max_points":2},
      {"id":"q5","type":"reasoning","lesson_id":"4d7b86fb-85b2-48e2-ad50-6fafc11c261e","prompt":"Varfor ar biologisk mangfald viktig for ett ekosystems motstandskraft?","options":null,"correct_index":null,"answer_key":"Hog mangfald ger funktionell redundans och fler ekosystemtjanster, vilket gor systemet stabilare och lattare att aterhamta sig efter storningar.","max_points":3},
      {"id":"q6","type":"reasoning","lesson_id":"69ad4504-24a2-41f0-87e3-a3efe54c0840","prompt":"Vad innebar barformaga (K) och vad hander nar en population overskrider den?","options":null,"correct_index":null,"answer_key":"Barformaga ar det maximala antal individer en miljo kan forsorja langsiktigt. Overskrids den okar dodlighet och konkurrens, och populationen minskar tillbaka mot K.","max_points":3}
    ]'::jsonb as questions,
    12 as max_score
)
insert into practice_tests
  (school_id, user_id, course_id, lesson_ids, status, questions, submission, score, max_score, shared_with_teacher, shared_at, created_at, submitted_at)
select
  '01f56fd5-bb94-49ff-a457-f335731da003'::uuid,
  s.user_id,
  '587edbc7-a9c7-4077-b1b8-b787e8d46c5e'::uuid,
  array[
    'a1de2ac5-3620-4555-89a8-5c1dafdc26fb',
    '47c72283-2925-40ba-814b-fdca51580f81',
    '9edc7125-0267-4f66-9ae8-42fd1c63e6b6',
    'a4a11781-fb29-4555-ad6a-9f946664141e',
    '4d7b86fb-85b2-48e2-ad50-6fafc11c261e',
    '69ad4504-24a2-41f0-87e3-a3efe54c0840'
  ]::uuid[],
  'graded',
  q.questions,
  s.submission,
  s.score,
  q.max_score,
  true,
  s.ts,
  s.ts,
  s.ts
from q
cross join (values
  (
    'a65e822b-8aa1-42a5-a4b0-fe98776b11cf'::uuid, 11,
    '2026-05-18 14:10:00+00'::timestamptz,
    '{"overall_feedback":"Mycket stark insats, Elin. Du visar god forstaelse for hela ekologiavsnittet. Finslipa resonemanget om vad som hander nar barformagan overskrids.","answers":[
      {"question_id":"q1","answer":"Individer av samma art i samma omrade","points":1,"max_points":1,"correct":true,"feedback":"Ratt."},
      {"question_id":"q2","answer":"En naringskedja visar vem som ater vem i en rad, en naringsvav ar manga kedjor som hanger ihop.","points":2,"max_points":2,"correct":null,"feedback":"Helt korrekt och tydligt formulerat."},
      {"question_id":"q3","answer":"10 procent","points":1,"max_points":1,"correct":true,"feedback":"Ratt, ungefar en tiondel fors vidare."},
      {"question_id":"q4","answer":"Bakterier fixerar kvave fran luften, vaxter tar upp det, det gar genom kedjan och kommer tillbaka nar saker bryts ned.","points":2,"max_points":2,"correct":null,"feedback":"Bra helhet, du namner alla stegen."},
      {"question_id":"q5","answer":"Med fler arter finns det reserver om nagon art forsvinner, sa ekosystemet klarar storningar battre.","points":3,"max_points":3,"correct":null,"feedback":"Utmarkt, du fangar funktionell redundans."},
      {"question_id":"q6","answer":"Barformagan ar hur manga som far plats. Om de blir for manga blir det brist.","points":2,"max_points":3,"correct":null,"feedback":"Ratt tanke, men utveckla vad bristen leder till (okad dodlighet, tillbaka mot K)."}
    ]}'::jsonb
  ),
  (
    '2771d074-4aa6-42b6-8262-ed4e59d8fcfe'::uuid, 8,
    '2026-05-19 09:30:00+00'::timestamptz,
    '{"overall_feedback":"Bra grund, Oskar. Repetera energiflodet mellan trofinivaer och ova pa att fa med alla delar i kvavets kretslopp.","answers":[
      {"question_id":"q1","answer":"Individer av samma art inom samma omrade","points":1,"max_points":1,"correct":true,"feedback":"Ratt."},
      {"question_id":"q2","answer":"En naringskedja ar en kedja och en naringsvav ar storre.","points":1,"max_points":2,"correct":null,"feedback":"Pa ratt vag, men forklara att naringsvaven ar flera sammanlankade kedjor."},
      {"question_id":"q3","answer":"50 procent","points":0,"max_points":1,"correct":false,"feedback":"Inte ratt, det ar cirka 10 procent som fors vidare."},
      {"question_id":"q4","answer":"Kvave tas upp av vaxter och aterfors nar de bryts ned av bakterier i marken.","points":2,"max_points":2,"correct":null,"feedback":"Bra, du har med upptag och nedbrytning."},
      {"question_id":"q5","answer":"For att om en art dor ut sa finns andra kvar som kan gora samma jobb.","points":2,"max_points":3,"correct":null,"feedback":"Bra poang, namn garna ekosystemtjanster ocksa."},
      {"question_id":"q6","answer":"Det ar max antal individer. Blir de fler minskar de igen.","points":2,"max_points":3,"correct":null,"feedback":"Ratt riktning, utveckla varfor (konkurrens och dodlighet okar)."}
    ]}'::jsonb
  ),
  (
    '7b193fa0-2683-4a09-9515-47a3d74eec97'::uuid, 10,
    '2026-05-20 16:45:00+00'::timestamptz,
    '{"overall_feedback":"Stark och jamn insats, Maja. Bygg ut kvavets kretslopp med fixering och denitrifikation sa har du allt.","answers":[
      {"question_id":"q1","answer":"Individer av samma art inom samma omrade vid samma tid","points":1,"max_points":1,"correct":true,"feedback":"Ratt, fint att du far med tiden ocksa."},
      {"question_id":"q2","answer":"Naringskedja = en linjar foljd. Naringsvav = flera kedjor som ar sammankopplade.","points":2,"max_points":2,"correct":null,"feedback":"Perfekt."},
      {"question_id":"q3","answer":"10 procent","points":1,"max_points":1,"correct":true,"feedback":"Ratt."},
      {"question_id":"q4","answer":"Vaxter tar upp kvave och det aterfors vid nedbrytning.","points":1,"max_points":2,"correct":null,"feedback":"Bra, men namn ocksa kvavefixering fran luften."},
      {"question_id":"q5","answer":"Hog mangfald ger redundans och fler ekosystemtjanster, sa systemet aterhamtar sig battre.","points":3,"max_points":3,"correct":null,"feedback":"Utmarkt resonemang."},
      {"question_id":"q6","answer":"Barformaga ar hur manga miljon klarar langsiktigt. Overskrids den okar dodligheten.","points":2,"max_points":3,"correct":null,"feedback":"Bra, beskriv garna att populationen pendlar tillbaka mot K."}
    ]}'::jsonb
  ),
  (
    '79cd5905-77e2-47f8-8837-2ddd57d08811'::uuid, 5,
    '2026-05-21 11:05:00+00'::timestamptz,
    '{"overall_feedback":"Du har borjat fa grepp om begreppen, Lukas. Fokusera nasta gang pa energiflode, mangfald och barformaga. Boka garna en genomgang.","answers":[
      {"question_id":"q1","answer":"Alla djur i en naringskedja","points":0,"max_points":1,"correct":false,"feedback":"Inte riktigt, en population ar individer av samma art i samma omrade."},
      {"question_id":"q2","answer":"En naringskedja ar nar djur ater varandra.","points":1,"max_points":2,"correct":null,"feedback":"Halvt ratt, men du missar vad en naringsvav ar."},
      {"question_id":"q3","answer":"10 procent","points":1,"max_points":1,"correct":true,"feedback":"Ratt."},
      {"question_id":"q4","answer":"Kvave finns i marken och vaxterna tar upp det.","points":1,"max_points":2,"correct":null,"feedback":"En del ratt, men kretsloppet behover fixering och aterforing ocksa."},
      {"question_id":"q5","answer":"For att det ar bra med manga djur.","points":2,"max_points":3,"correct":null,"feedback":"Forklara varfor: reserver och stabilitet vid storningar."},
      {"question_id":"q6","answer":"Vet inte riktigt.","points":0,"max_points":3,"correct":null,"feedback":"Barformaga ar max antal individer en miljo klarar. Repetera detta avsnitt."}
    ]}'::jsonb
  ),
  (
    '2c5bb9d4-a8c1-46e0-9833-8551cfa83d96'::uuid, 7,
    '2026-05-22 13:20:00+00'::timestamptz,
    '{"overall_feedback":"Jamn insats, Sara. Du ar nara pa flera fragor. Ova pa energiflodet och pa att motivera dina resonemang lite mer.","answers":[
      {"question_id":"q1","answer":"Individer av samma art inom samma omrade","points":1,"max_points":1,"correct":true,"feedback":"Ratt."},
      {"question_id":"q2","answer":"Naringskedja ar en rad och naringsvav ar flera kedjor.","points":1,"max_points":2,"correct":null,"feedback":"Pa ratt vag, var lite mer exakt med att de ar sammanlankade."},
      {"question_id":"q3","answer":"1 procent","points":0,"max_points":1,"correct":false,"feedback":"Inte ratt, det ar cirka 10 procent."},
      {"question_id":"q4","answer":"Bakterier fixerar kvave, vaxter tar upp det och det aterfors vid nedbrytning.","points":2,"max_points":2,"correct":null,"feedback":"Mycket bra, alla steg finns med."},
      {"question_id":"q5","answer":"Manga arter ar bra for naturen.","points":1,"max_points":3,"correct":null,"feedback":"Utveckla: redundans och ekosystemtjanster gor systemet motstandskraftigt."},
      {"question_id":"q6","answer":"Barformaga ar grunsen for hur manga som far plats. Overskrids den minskar populationen.","points":2,"max_points":3,"correct":null,"feedback":"Bra, beskriv mekanismen (konkurrens och dodlighet) for full poang."}
    ]}'::jsonb
  )
) as s(user_id, score, ts, submission);

select p.full_name, pt.score, pt.max_score, array_length(pt.lesson_ids,1) as lessons, pt.shared_at::date
from practice_tests pt join profiles p on p.id = pt.user_id
where pt.shared_with_teacher = true
order by pt.shared_at desc;
