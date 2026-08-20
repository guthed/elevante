// apps/web/scripts/verify-schedule-parse.ts
/**
 * Verifierar de rena funktionerna i schemaimporten — parsern och
 * referensvalideringen. Ingen databas inblandad.
 *
 * Kör: npx tsx scripts/verify-schedule-parse.ts (från apps/web)
 */
import { parseGenericScheduleCsv } from '../lib/schedule/parse-generic-csv';
import { validateSchedule, looksNonRecordable } from '../lib/schedule/canonical';
import type { CanonicalSchedule } from '../lib/schedule/canonical';

let failures = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('\nparseGenericScheduleCsv');

const goodCsv = [
  'course_code,course_name,class_name,day,start_time,end_time,room,teacher_email',
  'MATMAT02b,Matte nivå 2b,Ek25a,måndag,09:25,10:15,Hawaii,anna@skolan.se',
  'MATMAT02b,Matte nivå 2b,Ek25b,tisdag,10:15,11:05,Florida,anna@skolan.se',
  'SAMSAM01,Samhällskunskap 1,Ek26,wednesday,13:10,14:25,,',
  'LUNCH,Ek26 - Lunch,Ek26,fredag,12:15,12:40,The Diner,',
].join('\n');

const good = parseGenericScheduleCsv(goodCsv);
check('parsar en giltig fil', good.ok);

if (good.ok) {
  const s = good.schedule;
  check('3 kurser (kursrader slås ihop på course_code)', s.courses.length === 3,
    `fick ${s.courses.length}`);
  check('3 klasser', s.classes.length === 3, `fick ${s.classes.length}`);
  check('1 lärare (samma mejl två gånger = en post)', s.teachers.length === 1,
    `fick ${s.teachers.length}`);
  check('4 pass', s.timeslots.length === 4, `fick ${s.timeslots.length}`);

  const lunch = s.courses.find((c) => c.code === 'LUNCH');
  check('lunch flaggas som ej inspelningsbar', lunch?.recordable === false);
  const matte = s.courses.find((c) => c.code === 'MATMAT02b');
  check('vanlig kurs är inspelningsbar', matte?.recordable === true);
  check('explicit course_code bevaras', matte?.code === 'MATMAT02b');

  const monday = s.timeslots.find((t) => t.day === 'monday');
  check('svensk veckodag normaliseras', monday !== undefined);
  check('engelsk veckodag normaliseras',
    s.timeslots.some((t) => t.day === 'wednesday'));
  check('tid normaliseras till HH:MM:SS', monday?.startTime === '09:25:00',
    monday?.startTime);
  check('tom sal blir null', s.timeslots.find((t) => t.day === 'wednesday')?.room === null);
  check('lärare kopplas till passet', (monday?.teacherRefs.length ?? 0) === 1);
  check('pass utan lärare får tom lista',
    s.timeslots.find((t) => t.day === 'wednesday')?.teacherRefs.length === 0);
}

// Idempotens-nyckeln måste vara identisk mellan två körningar av samma fil,
// annars dubbleras schemat vid omuppladdning.
const again = parseGenericScheduleCsv(goodCsv);
if (good.ok && again.ok) {
  const a = good.schedule.timeslots.map((t) => t.externalRef).sort();
  const b = again.schedule.timeslots.map((t) => t.externalRef).sort();
  check('externalRef är deterministisk mellan körningar',
    JSON.stringify(a) === JSON.stringify(b));
}

console.log('\nparsern avvisar trasiga filer');

const cases: [string, string, string][] = [
  ['saknad rubrik', 'course_code,class_name\nA,Ek26', 'Rubriker saknas'],
  ['tom fil', '', 'Filen är tom'],
  [
    'okänd veckodag',
    'course_code,class_name,day,start_time,end_time\nA,Ek26,fnurkdag,09:00,10:00',
    'okänd veckodag',
  ],
  [
    'ogiltig tid',
    'course_code,class_name,day,start_time,end_time\nA,Ek26,måndag,9.00,10:00',
    'ogiltig tid',
  ],
  [
    'sluttid före starttid',
    'course_code,class_name,day,start_time,end_time\nA,Ek26,måndag,10:00,09:00',
    'sluttiden ligger inte efter',
  ],
  [
    'dubblerat pass',
    'course_code,class_name,day,start_time,end_time\n' +
      'A,Ek26,måndag,09:00,10:00\nA,Ek26,måndag,09:00,10:00',
    'dubblerat pass',
  ],
  [
    'tomt klassnamn',
    'course_code,class_name,day,start_time,end_time\nA,,måndag,09:00,10:00',
    'course_code och class_name krävs',
  ],
];

for (const [name, csv, expected] of cases) {
  const result = parseGenericScheduleCsv(csv);
  check(name, !result.ok && result.detail.includes(expected),
    result.ok ? 'accepterades felaktigt' : result.detail);
}

console.log('\nvalidateSchedule');

const broken: CanonicalSchedule = {
  courses: [
    { externalRef: 'c1', code: null, name: 'Kemi 1', subject: null, recordable: true },
  ],
  classes: [{ externalRef: 'k1', name: 'Na25' }],
  teachers: [{ externalRef: 't1', displayName: 'Anna', email: null }],
  timeslots: [
    {
      externalRef: 's1',
      courseRef: 'FINNS-INTE',
      classRefs: ['k1'],
      teacherRefs: ['t1'],
      day: 'monday',
      startTime: '09:00:00',
      endTime: '10:00:00',
      room: null,
      weeks: null,
    },
    {
      externalRef: 's2',
      courseRef: 'c1',
      classRefs: [],
      teacherRefs: ['OKÄND-LÄRARE'],
      day: 'tuesday',
      startTime: '11:00:00',
      endTime: '10:00:00',
      room: null,
      weeks: null,
    },
    {
      externalRef: 's2',
      courseRef: 'c1',
      classRefs: ['OKÄND-KLASS'],
      teacherRefs: [],
      day: 'friday',
      startTime: '09:00:00',
      endTime: '10:00:00',
      room: null,
      weeks: null,
    },
  ],
};

const issues = validateSchedule(broken);
const messages = issues.map((i) => i.message).join(' | ');
check('okänd kurs upptäcks', messages.includes('Okänd kurs'));
check('okänd klass upptäcks', messages.includes('Okänd klass'));
check('okänd lärare upptäcks', messages.includes('Okänd lärare'));
check('pass utan klass upptäcks', messages.includes('saknar klass'));
check('omvänd tid upptäcks', messages.includes('ligger inte efter'));
check('dubblerat externalRef upptäcks', messages.includes('Dubblerat'));
check('alla problem returneras, inte bara det första', issues.length >= 6,
  `fick ${issues.length}`);

const clean = validateSchedule({
  courses: [
    { externalRef: 'c1', code: null, name: 'Kemi 1', subject: null, recordable: true },
  ],
  classes: [{ externalRef: 'k1', name: 'Na25' }],
  teachers: [],
  timeslots: [
    {
      externalRef: 's1',
      courseRef: 'c1',
      classRefs: ['k1'],
      teacherRefs: [],
      day: 'monday',
      startTime: '09:00:00',
      endTime: '10:00:00',
      room: null,
      weeks: null,
    },
  ],
});
check('rent schema ger inga problem', clean.length === 0, `fick ${clean.length}`);

console.log('\nlooksNonRecordable');
check('lunch', looksNonRecordable('Ek26 - Lunch'));
check('mentortid', looksNonRecordable('Tk24b - Mentortid'));
check('resurstid', looksNonRecordable('Resurstid'));
check('personalmöte', looksNonRecordable('Personalmöte'));
check('bibliotek', looksNonRecordable('GA- Library'));
check('vanlig lektion är inspelningsbar', !looksNonRecordable('Kemi 1'));
check('idrott räknas som lektion', !looksNonRecordable('Idrott och hälsa nivå 1'));

console.log(failures === 0 ? '\nAllt grönt.\n' : `\n${failures} misslyckade kontroller.\n`);
process.exit(failures === 0 ? 0 : 1);
