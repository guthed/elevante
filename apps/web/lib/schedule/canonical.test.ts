import { describe, expect, it } from 'vitest';
import { looksNonRecordable, validateSchedule } from './canonical';
import type { CanonicalSchedule, CanonicalTimeslot } from './canonical';

function slot(overrides: Partial<CanonicalTimeslot> = {}): CanonicalTimeslot {
  return {
    externalRef: 's1',
    courseRef: 'c1',
    classRefs: ['k1'],
    teacherRefs: [],
    day: 'monday',
    startTime: '09:00:00',
    endTime: '10:00:00',
    room: null,
    weeks: null,
    ...overrides,
  };
}

function schedule(timeslots: CanonicalTimeslot[]): CanonicalSchedule {
  return {
    courses: [
      { externalRef: 'c1', code: null, name: 'Kemi 1', subject: null, recordable: true },
    ],
    classes: [{ externalRef: 'k1', name: 'Na25' }],
    teachers: [{ externalRef: 't1', displayName: 'Anna', email: null }],
    timeslots,
  };
}

function messages(s: CanonicalSchedule): string {
  return validateSchedule(s)
    .map((i) => i.message)
    .join(' | ');
}

describe('validateSchedule', () => {
  it('godkänner ett internt konsistent schema', () => {
    expect(validateSchedule(schedule([slot()]))).toEqual([]);
  });

  it('upptäcker pass som pekar på okänd kurs', () => {
    expect(messages(schedule([slot({ courseRef: 'FINNS-INTE' })]))).toContain('Okänd kurs');
  });

  it('upptäcker pass som pekar på okänd klass', () => {
    expect(messages(schedule([slot({ classRefs: ['FINNS-INTE'] })]))).toContain('Okänd klass');
  });

  it('upptäcker pass som pekar på okänd lärare', () => {
    expect(messages(schedule([slot({ teacherRefs: ['FINNS-INTE'] })]))).toContain(
      'Okänd lärare',
    );
  });

  it('upptäcker pass helt utan klass', () => {
    expect(messages(schedule([slot({ classRefs: [] })]))).toContain('saknar klass');
  });

  it('upptäcker sluttid som inte ligger efter starttid', () => {
    expect(
      messages(schedule([slot({ startTime: '11:00:00', endTime: '10:00:00' })])),
    ).toContain('ligger inte efter');
  });

  it('upptäcker dubblerat externalRef inom samma schema', () => {
    expect(
      messages(schedule([slot(), slot({ day: 'friday' })])),
    ).toContain('Dubblerat');
  });

  // Adminen ska se hela listan i ett svep i stället för att ladda upp om
  // och om igen för ett fel i taget.
  it('returnerar alla problem, inte bara det första', () => {
    const issues = validateSchedule(
      schedule([
        slot({ externalRef: 's1', courseRef: 'SAKNAS' }),
        slot({ externalRef: 's2', classRefs: [], teacherRefs: ['SAKNAS'] }),
      ]),
    );
    expect(issues.length).toBeGreaterThanOrEqual(3);
  });
});

describe('looksNonRecordable', () => {
  it.each(['Ek26 - Lunch', 'Tk24b - Mentortid', 'Resurstid', 'Personalmöte', 'GA- Library'])(
    'flaggar "%s" som ej inspelningsbart',
    (name) => {
      expect(looksNonRecordable(name)).toBe(true);
    },
  );

  it.each(['Kemi 1', 'Idrott och hälsa nivå 1', 'Matte 3c/4'])(
    'låter "%s" vara inspelningsbart',
    (name) => {
      expect(looksNonRecordable(name)).toBe(false);
    },
  );
});
