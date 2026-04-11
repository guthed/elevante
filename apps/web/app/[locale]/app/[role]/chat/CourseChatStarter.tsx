'use client';

import { useState, useTransition } from 'react';
import { startCourseChat } from '@/app/actions/chat';
import { Button } from '@/components/ui/Button';
import { Field, Select, Textarea } from '@/components/ui/Input';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';

type Course = { id: string; label: string };

type Props = {
  locale: Locale;
  courses: Course[];
  labels: Dictionary['app']['pages']['student']['chat'];
};

export function CourseChatStarter({ locale, courses, labels }: Props) {
  const [pending, startTransition] = useTransition();
  const [question, setQuestion] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');

  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      startCourseChat(formData);
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <Field id="chat-course" label={labels.pickCourse}>
        <Select
          id="chat-course"
          name="course_id"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="chat-question" label={labels.inputPlaceholder}>
        <Textarea
          id="chat-question"
          name="question"
          rows={4}
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={labels.inputPlaceholder}
        />
      </Field>
      <Button
        type="submit"
        disabled={pending || question.trim().length === 0 || !courseId}
      >
        {pending ? labels.sending : labels.send}
      </Button>
      <p className="text-xs text-[var(--color-ink-subtle)]">{labels.mockNotice}</p>
    </form>
  );
}
