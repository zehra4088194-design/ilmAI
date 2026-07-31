'use client';

import { useActionState, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveAttendance } from '@/lib/school-erp/actions';
import { INITIAL_SCHOOL_ACTION_STATE } from '@/lib/school-erp/types';

const STATUSES = [
  {
    value: 'present',
    label: 'P',
    title: 'Present',
    active: 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  {
    value: 'absent',
    label: 'A',
    title: 'Absent',
    active: 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300',
  },
  {
    value: 'late',
    label: 'L',
    title: 'Late',
    active: 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
  {
    value: 'excused',
    label: 'E',
    title: 'Excused',
    active: 'border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-300',
  },
] as const;

type Enrollment = {
  section_id: string;
  student_id: string;
  roll_number: string | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

type AttendanceRecord = {
  section_id: string;
  student_id: string;
  status: string;
  remarks: string | null;
};

export function AttendanceRegister({
  sections,
  enrollments,
  records,
  date,
  canManage,
}: {
  sections: any[];
  enrollments: Enrollment[];
  records: AttendanceRecord[];
  date: string;
  canManage: boolean;
}) {
  const [sectionId, setSectionId] = useState(String(sections[0]?.id || ''));
  const [attendanceDate, setAttendanceDate] = useState(date);
  const initial = useMemo(
    () => Object.fromEntries(records.map((record) => [record.student_id, record.status])),
    [records]
  );
  const [answers, setAnswers] = useState<Record<string, string>>(initial);
  const [state, action, pending] = useActionState(saveAttendance, INITIAL_SCHOOL_ACTION_STATE);
  const students = enrollments.filter((enrollment) => enrollment.section_id === sectionId);
  const entries = students.map((student) => ({
    studentId: student.student_id,
    status: answers[student.student_id] || 'present',
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium">
          Section
          <select
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.school_classes?.name || 'Class'} - {section.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium">
          Date
          <input
            type="date"
            value={attendanceDate}
            onChange={(event) => setAttendanceDate(event.target.value)}
            className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
          />
        </label>
      </div>

      <div className="border-border overflow-hidden rounded-lg border">
        <div className="bg-muted/50 grid grid-cols-[minmax(150px,1fr)_150px] gap-2 px-3 py-2 text-xs font-semibold">
          <span>Student</span>
          <span>Attendance</span>
        </div>
        <div className="divide-border divide-y">
          {students.map((student) => {
            const profile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
            return (
              <div
                key={student.student_id}
                className="grid min-h-14 grid-cols-[minmax(150px,1fr)_150px] items-center gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{profile?.full_name || 'Student'}</p>
                  <p className="text-muted-foreground text-xs">{student.roll_number || 'No roll number'}</p>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {STATUSES.map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      title={status.title}
                      disabled={!canManage}
                      onClick={() => setAnswers((current) => ({ ...current, [student.student_id]: status.value }))}
                      className={`h-8 w-8 rounded-md border text-xs font-bold transition ${
                        (answers[student.student_id] || 'present') === status.value
                          ? status.active
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {!students.length && (
            <p className="text-muted-foreground p-6 text-center text-sm">No active students in this section.</p>
          )}
        </div>
      </div>

      {canManage && students.length > 0 && (
        <form action={action} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="section_id" value={sectionId} />
          <input type="hidden" name="attendance_date" value={attendanceDate} />
          <input type="hidden" name="entries" value={JSON.stringify(entries)} />
          <Button type="submit" disabled={pending}>
            <Save className="h-4 w-4" />
            {pending ? 'Saving...' : 'Save attendance'}
          </Button>
          {state.message && (
            <span
              className={`flex items-center gap-1.5 text-xs ${state.success ? 'text-emerald-600' : 'text-destructive'}`}
            >
              {state.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
              {state.message}
            </span>
          )}
        </form>
      )}
    </div>
  );
}
