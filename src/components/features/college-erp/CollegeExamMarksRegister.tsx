'use client';

import { useActionState, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveCollegeExamMarks } from '@/lib/college-erp/actions';
import { INITIAL_COLLEGE_ACTION_STATE } from '@/lib/college-erp/types';

// Mirrors src/components/features/school-erp/ExamMarksRegister.tsx, pointed at the college action.
export function CollegeExamMarksRegister({
  schedules,
  enrollments,
  marks,
  canManage,
}: {
  schedules: any[];
  enrollments: any[];
  marks: any[];
  canManage: boolean;
}) {
  const [scheduleId, setScheduleId] = useState(String(schedules[0]?.id || ''));
  const schedule = schedules.find((item) => item.id === scheduleId);
  const students = enrollments.filter((item) => item.section_id === schedule?.section_id);
  const existing = useMemo(
    () =>
      Object.fromEntries(
        marks
          .filter((mark) => mark.schedule_id === scheduleId)
          .map((mark) => [mark.student_id, { marks: mark.marks_obtained == null ? '' : String(mark.marks_obtained), absent: mark.is_absent }])
      ),
    [marks, scheduleId]
  );
  const [values, setValues] = useState<Record<string, { marks: string; absent: boolean }>>(existing);
  const [state, action, pending] = useActionState(saveCollegeExamMarks, INITIAL_COLLEGE_ACTION_STATE);
  const entries = students.map((student) => {
    const value = values[student.student_id] || existing[student.student_id] || { marks: '', absent: false };
    return { studentId: student.student_id, marks: value.marks === '' ? 0 : Number(value.marks), absent: value.absent };
  });

  return (
    <div className="space-y-4">
      <label className="block max-w-xl space-y-1 text-xs font-medium">
        Date-sheet course
        <select
          value={scheduleId}
          onChange={(event) => {
            setScheduleId(event.target.value);
            const nextExisting = Object.fromEntries(
              marks.filter((mark) => mark.schedule_id === event.target.value).map((mark) => [mark.student_id, { marks: mark.marks_obtained == null ? '' : String(mark.marks_obtained), absent: mark.is_absent }])
            );
            setValues(nextExisting);
          }}
          className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
        >
          {schedules.map((item) => (
            <option key={item.id} value={item.id}>
              {item.college_exams?.name || 'Exam'} - {item.college_sections?.college_semesters?.name || 'Semester'} {item.college_sections?.name} - {item.course_name}
            </option>
          ))}
        </select>
      </label>

      <div className="border-border overflow-hidden rounded-lg border">
        <div className="bg-muted/50 grid grid-cols-[minmax(150px,1fr)_110px_70px] gap-3 px-3 py-2 text-xs font-semibold">
          <span>Student</span>
          <span>Marks / {schedule?.max_marks || 100}</span>
          <span>Absent</span>
        </div>
        <div className="divide-border divide-y">
          {students.map((student) => {
            const profile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
            const value = values[student.student_id] || { marks: '', absent: false };
            return (
              <div key={student.student_id} className="grid min-h-14 grid-cols-[minmax(150px,1fr)_110px_70px] items-center gap-3 px-3 py-2">
                <span className="truncate text-sm font-medium">{profile?.full_name || 'Student'}</span>
                <input
                  type="number"
                  min={0}
                  max={schedule?.max_marks || 100}
                  step="0.5"
                  disabled={!canManage || value.absent}
                  value={value.marks}
                  onChange={(event) => setValues((current) => ({ ...current, [student.student_id]: { ...value, marks: event.target.value } }))}
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                />
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={value.absent}
                  onChange={(event) => setValues((current) => ({ ...current, [student.student_id]: { marks: '', absent: event.target.checked } }))}
                  className="h-4 w-4"
                />
              </div>
            );
          })}
          {!students.length && <p className="text-muted-foreground p-6 text-center text-sm">No enrolled students for this schedule.</p>}
        </div>
      </div>

      {canManage && students.length > 0 && (
        <form action={action} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="schedule_id" value={scheduleId} />
          <input type="hidden" name="entries" value={JSON.stringify(entries)} />
          <Button type="submit" disabled={pending}>
            <Save className="h-4 w-4" />
            {pending ? 'Saving...' : 'Save marks'}
          </Button>
          {state.message && (
            <span className={`flex items-center gap-1.5 text-xs ${state.success ? 'text-emerald-600' : 'text-destructive'}`}>
              {state.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
              {state.message}
            </span>
          )}
        </form>
      )}
    </div>
  );
}
