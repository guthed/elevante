'use client';

import { startTransition, useActionState, useEffect, useRef } from 'react';
import { requestFormReset } from 'react-dom';
import {
  createCourse,
  deleteCourse,
  assignTeacherToCourse,
  removeTeacherFromCourse,
  type CreateCourseState,
  type DeleteCourseState,
  type AssignTeacherState,
} from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select } from '@/components/ui/Input';
import { HelpHint } from '@/components/ui/Tooltip';
import type { AdminCourseRow, AdminTeacherOption } from '@/lib/data/admin';
import type { Dictionary } from '@/lib/i18n/types';

type Labels = Dictionary['app']['pages']['admin']['courses'];

type Props = {
  courses: AdminCourseRow[];
  teachers: AdminTeacherOption[];
  labels: Labels;
};

export function AdminCoursesView({ courses, teachers, labels }: Props) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {courses.length === 0 ? (
          <EmptyState title={labels.empty} />
        ) : (
          courses.map((course) => (
            <CourseRow key={course.id} course={course} teachers={teachers} labels={labels} />
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{labels.createTitle}</CardTitle>
        </CardHeader>
        <CardBody>
          <CreateCourseForm labels={labels} />
        </CardBody>
      </Card>
    </div>
  );
}

function CourseRow({
  course,
  teachers,
  labels,
}: {
  course: AdminCourseRow;
  teachers: AdminTeacherOption[];
  labels: Labels;
}) {
  const [deleteState, deleteAction, deletePending] = useActionState<DeleteCourseState, FormData>(
    deleteCourse,
    { status: 'idle' },
  );
  const [assignState, assignAction, assignPending] = useActionState<AssignTeacherState, FormData>(
    assignTeacherToCourse,
    { status: 'idle' },
  );
  const [removeState, removeAction, removePending] = useActionState<AssignTeacherState, FormData>(
    removeTeacherFromCourse,
    { status: 'idle' },
  );

  const assignedIds = new Set(course.teachers.map((t) => t.id));
  const available = teachers.filter((t) => !assignedIds.has(t.id));

  return (
    <Card>
      <CardBody>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-[var(--color-ink-subtle)]">
                {course.code}
              </div>
              <div className="mt-1 font-serif text-2xl text-[var(--color-primary)]">
                {course.name}
              </div>
            </div>
            <form action={deleteAction}>
              <input type="hidden" name="course_id" value={course.id} />
              <Button type="submit" variant="danger" size="sm" disabled={deletePending}>
                {deletePending ? labels.deleting : labels.delete}
              </Button>
            </form>
          </div>
          {deleteState.status === 'error' ? (
            <p role="alert" className="text-sm text-[var(--color-error)]">
              {deleteState.code === 'has-lessons'
                ? labels.deleteErrorHasLessons
                : labels.deleteErrorGeneric}
            </p>
          ) : null}

          <div>
            <p className="text-sm font-medium text-[var(--color-primary)]">
              {labels.teachersHeading}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {course.teachers.length === 0 ? (
                <li className="text-sm text-[var(--color-ink-muted)]">{labels.noTeachers}</li>
              ) : (
                course.teachers.map((teacher) => (
                  <li key={teacher.id}>
                    <form
                      action={removeAction}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1 text-sm"
                    >
                      <input type="hidden" name="course_id" value={course.id} />
                      <input type="hidden" name="teacher_id" value={teacher.id} />
                      <span>{teacher.fullName ?? '—'}</span>
                      <button
                        type="submit"
                        aria-label={labels.removeTeacher}
                        disabled={removePending}
                        className="text-[var(--color-ink-subtle)] disabled:opacity-50"
                      >
                        ×
                      </button>
                    </form>
                  </li>
                ))
              )}
            </ul>
            {removeState.status === 'error' ? (
              <p role="alert" className="mt-2 text-sm text-[var(--color-error)]">
                {labels.assignError}
              </p>
            ) : null}

            {available.length > 0 ? (
              <form action={assignAction} className="mt-3 flex items-end gap-2">
                <input type="hidden" name="course_id" value={course.id} />
                <div className="flex-1">
                  <Field id={`assign-teacher-${course.id}`} label={labels.pickTeacher}>
                    <Select id={`assign-teacher-${course.id}`} name="teacher_id" required defaultValue="">
                      <option value="" disabled>
                        {labels.pickTeacher}
                      </option>
                      {available.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.fullName ?? teacher.email}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Button type="submit" size="sm" disabled={assignPending}>
                  {assignPending ? labels.assigning : labels.assign}
                </Button>
              </form>
            ) : null}
            {assignState.status === 'error' ? (
              <p role="alert" className="mt-2 text-sm text-[var(--color-error)]">
                {labels.assignError}
              </p>
            ) : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function CreateCourseForm({ labels }: { labels: Labels }) {
  const [state, formAction, pending] = useActionState<CreateCourseState, FormData>(createCourse, {
    status: 'idle',
  });
  const formRef = useRef<HTMLFormElement>(null);

  // Admins skapar ofta flera kurser i följd (MA3, MA4, SV1 …). React 19
  // återställer inte formuläret automatiskt när en Server Action landar —
  // utan detta riskerar nästa kurs att av misstag återanvända föregående
  // kod/namn. Samma mönster som CreateClassForm i AdminClassesView.tsx.
  //
  // requestFormReset måste köras inuti en transition/action — annars
  // loggar React 19.2 "requestFormReset was called outside a transition
  // or action". Vår useEffect körs efter att Server Action-transitionen
  // redan avslutats, så vi öppnar en egen med startTransition.
  useEffect(() => {
    if (state.status !== 'success') return;
    const form = formRef.current;
    if (!form) return;
    startTransition(() => {
      requestFormReset(form);
    });
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <Field
        id="course-code"
        label={
          <>
            {labels.codeLabel}
            <HelpHint label={labels.codeHint} />
          </>
        }
      >
        <Input id="course-code" name="code" type="text" required placeholder="MA3" />
      </Field>
      <Field id="course-name" label={labels.nameLabel}>
        <Input id="course-name" name="name" type="text" required placeholder="Matematik 3c" />
      </Field>
      {state.status === 'success' ? (
        <p role="status" className="text-sm text-[var(--color-success)]">
          {labels.createSuccess}
        </p>
      ) : null}
      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {state.code === 'duplicate' ? labels.createErrorDuplicate : labels.createErrorGeneric}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? labels.creating : labels.createSubmit}
      </Button>
    </form>
  );
}
