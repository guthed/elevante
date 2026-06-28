// Syntetisk demodata för den live-renderade förståelse-kartan i investerardecket.
// Ingen riktig elevdata — en påhittad Ekologi-lektion som speglar de syntetiska
// lektionerna i appen. Matchar `LessonInsight`-typen exakt så den riktiga
// `InsightHeatmap`-komponenten kan renderas utan Supabase/auth.

import type { LessonInsight } from '@/lib/data/teacher';

const CONCEPTS = ['Fotosyntes', 'Cellandning', 'Näringskedjor', 'Kolets kretslopp', 'Ekosystem'];

export const DEMO_LESSON_INSIGHT: LessonInsight = {
  lessonId: 'demo-ekologi-01',
  title: 'Ekologi — energiflöden och kretslopp',
  concepts: CONCEPTS,
  students: [
    {
      id: 's1',
      fullName: 'Astrid Lindqvist',
      hasViewed: true,
      viewCount: 4,
      lastViewedAt: '2026-06-28T07:40:00Z',
      totalQuestions: 4,
      conceptQuestionCounts: { Cellandning: 3, Fotosyntes: 1 },
      questions: [
        { id: 's1q1', content: 'Varför behöver cellerna syre om fotosyntesen redan gör syre?', concepts: ['Cellandning', 'Fotosyntes'], createdAt: '2026-06-28T07:42:00Z' },
        { id: 's1q2', content: 'Vad är skillnaden mellan cellandning och vanlig förbränning?', concepts: ['Cellandning'], createdAt: '2026-06-28T07:50:00Z' },
        { id: 's1q3', content: 'Sker cellandning hela tiden eller bara på natten?', concepts: ['Cellandning'], createdAt: '2026-06-28T08:05:00Z' },
      ],
    },
    {
      id: 's2',
      fullName: 'Hugo Bergström',
      hasViewed: true,
      viewCount: 2,
      lastViewedAt: '2026-06-27T19:10:00Z',
      totalQuestions: 3,
      conceptQuestionCounts: { Näringskedjor: 2, Ekosystem: 1 },
      questions: [
        { id: 's2q1', content: 'Vad händer i näringskedjan om alla rävar försvinner?', concepts: ['Näringskedjor'], createdAt: '2026-06-27T19:12:00Z' },
        { id: 's2q2', content: 'Hur mycket energi försvinner mellan varje nivå i kedjan?', concepts: ['Näringskedjor', 'Ekosystem'], createdAt: '2026-06-27T19:20:00Z' },
      ],
    },
    {
      id: 's3',
      fullName: 'Maja Nyström',
      hasViewed: true,
      viewCount: 1,
      lastViewedAt: '2026-06-27T16:30:00Z',
      totalQuestions: 0,
      conceptQuestionCounts: {},
      questions: [],
    },
    {
      id: 's4',
      fullName: 'Elias Holm',
      hasViewed: false,
      viewCount: 0,
      lastViewedAt: null,
      totalQuestions: 0,
      conceptQuestionCounts: {},
      questions: [],
    },
    {
      id: 's5',
      fullName: 'Saga Lund',
      hasViewed: true,
      viewCount: 3,
      lastViewedAt: '2026-06-28T06:55:00Z',
      totalQuestions: 3,
      conceptQuestionCounts: { 'Kolets kretslopp': 2, Fotosyntes: 1 },
      questions: [
        { id: 's5q1', content: 'Vart tar kolet vägen när en växt dör?', concepts: ['Kolets kretslopp'], createdAt: '2026-06-28T06:57:00Z' },
        { id: 's5q2', content: 'Hur hänger förbränning ihop med kolets kretslopp?', concepts: ['Kolets kretslopp', 'Fotosyntes'], createdAt: '2026-06-28T07:05:00Z' },
      ],
    },
    {
      id: 's6',
      fullName: 'Vincent Falk',
      hasViewed: true,
      viewCount: 5,
      lastViewedAt: '2026-06-28T08:20:00Z',
      totalQuestions: 5,
      conceptQuestionCounts: { Ekosystem: 3, Cellandning: 2 },
      questions: [
        { id: 's6q1', content: 'Vad menas med att ett ekosystem är i balans?', concepts: ['Ekosystem'], createdAt: '2026-06-28T08:21:00Z' },
        { id: 's6q2', content: 'Kan ett ekosystem återhämta sig efter en skogsbrand?', concepts: ['Ekosystem'], createdAt: '2026-06-28T08:28:00Z' },
        { id: 's6q3', content: 'Hur snabbt sker cellandning jämfört med fotosyntes?', concepts: ['Cellandning'], createdAt: '2026-06-28T08:33:00Z' },
      ],
    },
  ],
};

export const DEMO_AI_INSIGHT =
  'Klassen fastnar tydligast på cellandning — Astrid och Vincent har flest frågor där, ofta i relation till fotosyntesen. Näringskedjor och kolets kretslopp sitter bättre. Maja har öppnat lektionen utan att fråga, och Elias har inte öppnat den än.';
