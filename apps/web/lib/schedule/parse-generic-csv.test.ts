import { describe, expect, it } from 'vitest';
import { parseGenericScheduleCsv } from './parse-generic-csv';

const goodCsv = [
  'course_code,course_name,class_name,day,start_time,end_time,room,teacher_email',
  'MATMAT02b,Matte nivå 2b,Ek25a,måndag,09:25,10:15,Hawaii,anna@skolan.se',
  'MATMAT02b,Matte nivå 2b,Ek25b,tisdag,10:15,11:05,Florida,anna@skolan.se',
  'SAMSAM01,Samhällskunskap 1,Ek26,wednesday,13:10,14:25,,',
  'LUNCH,Ek26 - Lunch,Ek26,fredag,12:15,12:40,The Diner,',
].join('\n');

function parseOk(csv: string) {
  const result = parseGenericScheduleCsv(csv);
  if (!result.ok) throw new Error(`Förväntade lyckad parsning: ${result.detail}`);
  return result.schedule;
}

describe('parseGenericScheduleCsv', () => {
  it('slår ihop rader till kurser, klasser, lärare och pass', () => {
    const s = parseOk(goodCsv);
    expect(s.courses).toHaveLength(3);
    expect(s.classes).toHaveLength(3);
    // Samma mejladress på två rader ska bli en enda lärare.
    expect(s.teachers).toHaveLength(1);
    expect(s.timeslots).toHaveLength(4);
  });

  it('bevarar explicit course_code i stället för att härleda en ny', () => {
    const s = parseOk(goodCsv);
    expect(s.courses.find((c) => c.code === 'MATMAT02b')).toBeDefined();
  });

  it('flaggar lunch som ej inspelningsbar men vanliga kurser som inspelningsbara', () => {
    const s = parseOk(goodCsv);
    expect(s.courses.find((c) => c.code === 'LUNCH')?.recordable).toBe(false);
    expect(s.courses.find((c) => c.code === 'MATMAT02b')?.recordable).toBe(true);
  });

  it('normaliserar svenska och engelska veckodagar', () => {
    const s = parseOk(goodCsv);
    expect(s.timeslots.map((t) => t.day)).toEqual(
      expect.arrayContaining(['monday', 'tuesday', 'wednesday', 'friday']),
    );
  });

  it('normaliserar tider till HH:MM:SS', () => {
    const s = parseOk(goodCsv);
    expect(s.timeslots.find((t) => t.day === 'monday')?.startTime).toBe('09:25:00');
  });

  it('gör tom sal till null och tom lärarkolumn till tom lista', () => {
    const slot = parseOk(goodCsv).timeslots.find((t) => t.day === 'wednesday');
    expect(slot?.room).toBeNull();
    expect(slot?.teacherRefs).toEqual([]);
  });

  it('kopplar läraren till passet när teacher_email finns', () => {
    const slot = parseOk(goodCsv).timeslots.find((t) => t.day === 'monday');
    expect(slot?.teacherRefs).toHaveLength(1);
  });

  // Hela idempotensen hänger på den här: samma fil måste ge samma
  // externalRef, annars dubbleras schemat vid omuppladdning.
  it('ger deterministiska externalRef mellan körningar', () => {
    const first = parseOk(goodCsv).timeslots.map((t) => t.externalRef).sort();
    const second = parseOk(goodCsv).timeslots.map((t) => t.externalRef).sort();
    expect(second).toEqual(first);
  });
});

describe('parseGenericScheduleCsv — avvisar trasiga filer', () => {
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

  it.each(cases)('%s', (_name, csv, expected) => {
    const result = parseGenericScheduleCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.detail).toContain(expected);
  });
});

describe('parseGenericScheduleCsv — lärare utan mejladress', () => {
  const csv = [
    'course_code,class_name,day,start_time,end_time,teacher_name,teacher_email',
    'KEM01,Na25,måndag,09:00,10:00,Alfred,',
    'KEM01,Na25,tisdag,09:00,10:00,Alfred,',
    'FYS02,Na25,onsdag,09:00,10:00,Anna,anna@skolan.se',
  ].join('\n');

  it('accepterar en lärare som bara har namn', () => {
    const result = parseGenericScheduleCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const alfred = result.schedule.teachers.find((t) => t.displayName === 'Alfred');
    expect(alfred).toBeDefined();
    expect(alfred?.email).toBeNull();
  });

  it('slår ihop samma namn till en lärare över flera rader', () => {
    const result = parseGenericScheduleCsv(csv);
    if (!result.ok) throw new Error(result.detail);
    expect(result.schedule.teachers).toHaveLength(2);
  });

  // Mejladressen är den stabilare identiteten och ska vinna när båda finns,
  // så att en omstavning av namnet inte skapar en andra lärare.
  it('nycklar på mejladressen när den finns', () => {
    const result = parseGenericScheduleCsv(csv);
    if (!result.ok) throw new Error(result.detail);
    const anna = result.schedule.teachers.find((t) => t.email === 'anna@skolan.se');
    expect(anna?.externalRef).toBe('csv:teacher:anna@skolan.se');
  });
});
