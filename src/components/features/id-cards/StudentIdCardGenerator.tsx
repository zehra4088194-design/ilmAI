'use client';

import { useMemo, useState } from 'react';
import { PersonSearchInput } from '@/components/features/school-erp/PersonSearchInput';
import { PrintReportButton } from '@/components/features/school-erp/PrintReportButton';
import { useNameSearch } from '@/lib/hooks/useNameSearch';
import { StudentIdCard, type IdCardBranding, type IdCardStudent } from './StudentIdCard';

type SectionOption = { id: string; label: string };

// Pick a class/section (or search a student), tick who needs a card, print/save-as-PDF the
// selected batch — same flow as School Markaz's ID card generator, in Ilm AI's own card design.
export function StudentIdCardGenerator({
  students,
  sections,
  branding,
}: {
  students: IdCardStudent[];
  sections: SectionOption[];
  branding: IdCardBranding;
}) {
  const [sectionId, setSectionId] = useState('');
  const { query, setQuery, filtered } = useNameSearch(students, (s) => `${s.fullName} ${s.idNumber}`);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const visible = useMemo(
    () => (sectionId ? filtered.filter((s) => s.sectionId === sectionId) : filtered),
    [filtered, sectionId]
  );

  const selectedStudents = students.filter((s) => selected[s.studentId]);

  function toggleAll(checked: boolean) {
    setSelected((current) => {
      const next = { ...current };
      for (const student of visible) next[student.studentId] = checked;
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <select
          value={sectionId}
          onChange={(event) => setSectionId(event.target.value)}
          className="border-input bg-background h-10 rounded-lg border px-3 text-sm"
        >
          <option value="">All classes / sections</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>{section.label}</option>
          ))}
        </select>
        <PersonSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search student by name..."
          resultCount={query ? visible.length : undefined}
        />
        <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={visible.length > 0 && visible.every((s) => selected[s.studentId])}
            onChange={(event) => toggleAll(event.target.checked)}
            className="h-4 w-4"
          />
          Select all shown ({visible.length})
        </label>
        {selectedStudents.length > 0 && <PrintReportButton />}
      </div>

      {selectedStudents.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2 text-xs print:hidden">
            {selectedStudents.length} card{selectedStudents.length === 1 ? '' : 's'} ready to print.
          </p>
          <div className="flex flex-wrap gap-3">
            {selectedStudents.map((student) => (
              <StudentIdCard key={student.studentId} student={student} branding={branding} />
            ))}
          </div>
        </div>
      )}

      <div className="print:hidden">
        <p className="text-muted-foreground mb-2 text-xs">Tick the students who need a card:</p>
        <div className="border-border divide-border max-h-96 divide-y overflow-y-auto rounded-lg border">
          {visible.map((student) => (
            <label key={student.studentId} className="flex items-center gap-3 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={!!selected[student.studentId]}
                onChange={(event) => setSelected((current) => ({ ...current, [student.studentId]: event.target.checked }))}
                className="h-4 w-4"
              />
              <span className="flex-1 truncate font-medium">{student.fullName}</span>
              <span className="text-muted-foreground text-xs">{student.idNumber}</span>
              <span className="text-muted-foreground text-xs">{student.classLabel}</span>
            </label>
          ))}
          {!visible.length && <p className="text-muted-foreground p-6 text-center text-sm">No students match.</p>}
        </div>
      </div>
    </div>
  );
}
