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
      {"id":"q1","type":"multiple_choice","lesson_id":"a1de2ac5-3620-4555-89a8-5c1dafdc26fb","prompt":"Vad menas med en population i ekologi?","options":["Alla organismer i ett ekosystem","Individer av samma art inom samma område","Alla djur i en näringskedja","Samspelet mellan olika arter"],"correct_index":1,"answer_key":"Individer av samma art inom samma område vid samma tid.","max_points":1},
      {"id":"q2","type":"short_answer","lesson_id":"47c72283-2925-40ba-814b-fdca51580f81","prompt":"Förklara skillnaden mellan en näringskedja och en näringsväv.","options":null,"correct_index":null,"answer_key":"En näringskedja är en linjär följd av vem som äter vem. En näringsväv är flera sammanlänkade näringskedjor i ett ekosystem.","max_points":2},
      {"id":"q3","type":"multiple_choice","lesson_id":"9edc7125-0267-4f66-9ae8-42fd1c63e6b6","prompt":"Ungefär hur stor andel av energin förs vidare till nästa trofinivå?","options":["1 procent","10 procent","50 procent","90 procent"],"correct_index":1,"answer_key":"Cirka 10 procent, resten förloras främst som värme.","max_points":1},
      {"id":"q4","type":"short_answer","lesson_id":"a4a11781-fb29-4555-ad6a-9f946664141e","prompt":"Beskriv kvävets kretslopp kortfattat.","options":null,"correct_index":null,"answer_key":"Kväve fixeras från luften av bakterier, tas upp av växter, vandrar genom näringskedjan och återförs till marken och luften via nedbrytning och denitrifikation.","max_points":2},
      {"id":"q5","type":"reasoning","lesson_id":"4d7b86fb-85b2-48e2-ad50-6fafc11c261e","prompt":"Varför är biologisk mångfald viktig för ett ekosystems motståndskraft?","options":null,"correct_index":null,"answer_key":"Hög mångfald ger funktionell redundans och fler ekosystemtjänster, vilket gör systemet stabilare och lättare att återhämta sig efter störningar.","max_points":3},
      {"id":"q6","type":"reasoning","lesson_id":"69ad4504-24a2-41f0-87e3-a3efe54c0840","prompt":"Vad innebär bärförmåga (K) och vad händer när en population överskrider den?","options":null,"correct_index":null,"answer_key":"Bärförmåga är det maximala antal individer en miljö kan försörja långsiktigt. Överskrids den ökar dödlighet och konkurrens, och populationen minskar tillbaka mot K.","max_points":3}
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
    'a65e822b-8aa1-42a5-a4b0-fe98776b11cf'::uuid, 11, '2026-05-18 14:10:00+00'::timestamptz,
    '{"overall_feedback":"Mycket stark insats, Elin. Du visar god förståelse för hela ekologiavsnittet. Finslipa resonemanget om vad som händer när bärförmågan överskrids.","answers":[{"question_id":"q1","answer":"Individer av samma art i samma område","points":1,"max_points":1,"correct":true,"feedback":"Rätt."},{"question_id":"q2","answer":"En näringskedja visar vem som äter vem i en rad, en näringsväv är många kedjor som hänger ihop.","points":2,"max_points":2,"correct":null,"feedback":"Helt korrekt och tydligt formulerat."},{"question_id":"q3","answer":"10 procent","points":1,"max_points":1,"correct":true,"feedback":"Rätt, ungefär en tiondel förs vidare."},{"question_id":"q4","answer":"Bakterier fixerar kväve från luften, växter tar upp det, det går genom kedjan och kommer tillbaka när saker bryts ned.","points":2,"max_points":2,"correct":null,"feedback":"Bra helhet, du nämner alla stegen."},{"question_id":"q5","answer":"Med fler arter finns det reserver om någon art försvinner, så ekosystemet klarar störningar bättre.","points":3,"max_points":3,"correct":null,"feedback":"Utmärkt, du fångar funktionell redundans."},{"question_id":"q6","answer":"Bärförmågan är hur många som får plats. Om de blir för många blir det brist.","points":2,"max_points":3,"correct":null,"feedback":"Rätt tanke, men utveckla vad bristen leder till (ökad dödlighet, tillbaka mot K)."}]}'::jsonb
  ),
  (
    '2771d074-4aa6-42b6-8262-ed4e59d8fcfe'::uuid, 8, '2026-05-19 09:30:00+00'::timestamptz,
    '{"overall_feedback":"Bra grund, Oskar. Repetera energiflödet mellan trofinivåer och öva på att få med alla delar i kvävets kretslopp.","answers":[{"question_id":"q1","answer":"Individer av samma art inom samma område","points":1,"max_points":1,"correct":true,"feedback":"Rätt."},{"question_id":"q2","answer":"En näringskedja är en kedja och en näringsväv är större.","points":1,"max_points":2,"correct":null,"feedback":"På rätt väg, men förklara att näringsväven är flera sammanlänkade kedjor."},{"question_id":"q3","answer":"50 procent","points":0,"max_points":1,"correct":false,"feedback":"Inte rätt, det är cirka 10 procent som förs vidare."},{"question_id":"q4","answer":"Kväve tas upp av växter och återförs när de bryts ned av bakterier i marken.","points":2,"max_points":2,"correct":null,"feedback":"Bra, du har med upptag och nedbrytning."},{"question_id":"q5","answer":"För att om en art dör ut så finns andra kvar som kan göra samma jobb.","points":2,"max_points":3,"correct":null,"feedback":"Bra poäng, nämn gärna ekosystemtjänster också."},{"question_id":"q6","answer":"Det är max antal individer. Blir de fler minskar de igen.","points":2,"max_points":3,"correct":null,"feedback":"Rätt riktning, utveckla varför (konkurrens och dödlighet ökar)."}]}'::jsonb
  ),
  (
    '7b193fa0-2683-4a09-9515-47a3d74eec97'::uuid, 10, '2026-05-20 16:45:00+00'::timestamptz,
    '{"overall_feedback":"Stark och jämn insats, Maja. Bygg ut kvävets kretslopp med fixering och denitrifikation så har du allt.","answers":[{"question_id":"q1","answer":"Individer av samma art inom samma område vid samma tid","points":1,"max_points":1,"correct":true,"feedback":"Rätt, fint att du får med tiden också."},{"question_id":"q2","answer":"Näringskedja = en linjär följd. Näringsväv = flera kedjor som är sammankopplade.","points":2,"max_points":2,"correct":null,"feedback":"Perfekt."},{"question_id":"q3","answer":"10 procent","points":1,"max_points":1,"correct":true,"feedback":"Rätt."},{"question_id":"q4","answer":"Växter tar upp kväve och det återförs vid nedbrytning.","points":1,"max_points":2,"correct":null,"feedback":"Bra, men nämn också kvävefixering från luften."},{"question_id":"q5","answer":"Hög mångfald ger redundans och fler ekosystemtjänster, så systemet återhämtar sig bättre.","points":3,"max_points":3,"correct":null,"feedback":"Utmärkt resonemang."},{"question_id":"q6","answer":"Bärförmåga är hur många miljön klarar långsiktigt. Överskrids den ökar dödligheten.","points":2,"max_points":3,"correct":null,"feedback":"Bra, beskriv gärna att populationen pendlar tillbaka mot K."}]}'::jsonb
  ),
  (
    '79cd5905-77e2-47f8-8837-2ddd57d08811'::uuid, 5, '2026-05-21 11:05:00+00'::timestamptz,
    '{"overall_feedback":"Du har börjat få grepp om begreppen, Lukas. Fokusera nästa gång på energiflöde, mångfald och bärförmåga. Boka gärna en genomgång.","answers":[{"question_id":"q1","answer":"Alla djur i en näringskedja","points":0,"max_points":1,"correct":false,"feedback":"Inte riktigt, en population är individer av samma art i samma område."},{"question_id":"q2","answer":"En näringskedja är när djur äter varandra.","points":1,"max_points":2,"correct":null,"feedback":"Halvt rätt, men du missar vad en näringsväv är."},{"question_id":"q3","answer":"10 procent","points":1,"max_points":1,"correct":true,"feedback":"Rätt."},{"question_id":"q4","answer":"Kväve finns i marken och växterna tar upp det.","points":1,"max_points":2,"correct":null,"feedback":"En del rätt, men kretsloppet behöver fixering och återföring också."},{"question_id":"q5","answer":"För att det är bra med många djur.","points":2,"max_points":3,"correct":null,"feedback":"Förklara varför: reserver och stabilitet vid störningar."},{"question_id":"q6","answer":"Vet inte riktigt.","points":0,"max_points":3,"correct":null,"feedback":"Bärförmåga är max antal individer en miljö klarar. Repetera detta avsnitt."}]}'::jsonb
  ),
  (
    '2c5bb9d4-a8c1-46e0-9833-8551cfa83d96'::uuid, 7, '2026-05-22 13:20:00+00'::timestamptz,
    '{"overall_feedback":"Jämn insats, Sara. Du är nära på flera frågor. Öva på energiflödet och på att motivera dina resonemang lite mer.","answers":[{"question_id":"q1","answer":"Individer av samma art inom samma område","points":1,"max_points":1,"correct":true,"feedback":"Rätt."},{"question_id":"q2","answer":"Näringskedja är en rad och näringsväv är flera kedjor.","points":1,"max_points":2,"correct":null,"feedback":"På rätt väg, var lite mer exakt med att de är sammanlänkade."},{"question_id":"q3","answer":"1 procent","points":0,"max_points":1,"correct":false,"feedback":"Inte rätt, det är cirka 10 procent."},{"question_id":"q4","answer":"Bakterier fixerar kväve, växter tar upp det och det återförs vid nedbrytning.","points":2,"max_points":2,"correct":null,"feedback":"Mycket bra, alla steg finns med."},{"question_id":"q5","answer":"Många arter är bra för naturen.","points":1,"max_points":3,"correct":null,"feedback":"Utveckla: redundans och ekosystemtjänster gör systemet motståndskraftigt."},{"question_id":"q6","answer":"Bärförmåga är gränsen för hur många som får plats. Överskrids den minskar populationen.","points":2,"max_points":3,"correct":null,"feedback":"Bra, beskriv mekanismen (konkurrens och dödlighet) för full poäng."}]}'::jsonb
  )
) as s(user_id, score, ts, submission);
