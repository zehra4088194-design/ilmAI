'use client';

import { useActionState, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseCsv, toCsv } from '@/lib/school-erp/csv';
import { importSchoolStaff, importSchoolStudents } from '@/lib/school-erp/import-actions';
import { INITIAL_SCHOOL_IMPORT_STATE, type SchoolImportState } from '@/lib/school-erp/import-types';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

const STUDENT_TEMPLATE = toCsv(
  ['full_name', 'admission_number', 'roll_number', 'email', 'phone', 'section', 'guardian_name', 'guardian_email', 'guardian_phone', 'guardian_relationship'],
  [
    ['Ayesha Khan', '2026-001', '1', '', '03001234567', '9-A', 'Imran Khan', '', '03007654321', 'father'],
    ['Bilal Ahmed', '2026-002', '2', 'bilal@example.com', '', '9-A', 'Sara Ahmed', 'sara@example.com', '', 'mother'],
  ]
);

const STAFF_TEMPLATE = toCsv(
  ['full_name', 'email', 'role', 'designation', 'employee_code', 'phone'],
  [
    ['Hina Raza', 'hina@example.com', 'teacher', 'Senior Physics Teacher', 'EMP-01', '03001112233'],
    ['Usman Ali', '', 'accountant', 'Accounts Officer', 'EMP-02', '03004445566'],
  ]
);

function downloadCsv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function ImportResult({ state }: { state: SchoolImportState }) {
  if (!state.message) return null;
  return (
    <div className="space-y-3">
      <p
        role="status"
        className={`flex items-center gap-2 text-xs ${state.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
      >
        {state.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
        {state.message}
      </p>

      {state.credentials.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
          <p className="text-xs font-semibold">{state.credentials.length} new logins were created</p>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Passwords are shown only once. Download and distribute them now — they cannot be recovered later, only reset.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() =>
              downloadCsv(
                `ilm-ai-logins-${new Date().toISOString().slice(0, 10)}.csv`,
                toCsv(
                  ['name', 'role', 'email', 'password'],
                  state.credentials.map((item) => [item.name, item.role, item.email, item.password])
                )
              )
            }
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Download logins CSV
          </Button>
        </div>
      )}

      {state.errors.length > 0 && (
        <div className="border-destructive/40 max-h-60 overflow-y-auto rounded-lg border p-3">
          <p className="text-xs font-semibold">{state.errors.length} rows could not be imported</p>
          <ul className="mt-2 space-y-1">
            {state.errors.map((item) => (
              <li key={`${item.row}-${item.name}`} className="text-muted-foreground text-[11px]">
                Row {item.row} ({item.name}): {item.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CsvField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const preview = useMemo(() => {
    if (!value.trim()) return null;
    const { headers, rows } = parseCsv(value);
    return { headers: headers.filter(Boolean), rows: rows.slice(0, 5), total: rows.length };
  }, [value]);

  return (
    <div className="space-y-3">
      <label className="border-input hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 text-sm">
        <Upload className="text-muted-foreground h-4 w-4" />
        <span className="text-muted-foreground">Choose a .csv file, or paste the rows below</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) onChange(await file.text());
          }}
        />
      </label>

      <textarea
        name="csv"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={6}
        spellCheck={false}
        placeholder="full_name,admission_number,..."
        className="border-input bg-background w-full rounded-lg border p-3 font-mono text-xs"
        required
      />

      {preview && (
        <div className="overflow-x-auto rounded-lg border">
          <p className="text-muted-foreground border-b px-3 py-2 text-[11px]">
            {preview.total} rows detected — showing first {preview.rows.length}
          </p>
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground border-b">
              <tr>
                {preview.headers.map((header) => (
                  <th key={header} className="px-3 py-1.5 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, index) => (
                <tr key={index} className="border-b last:border-0">
                  {preview.headers.map((header) => (
                    <td key={header} className="px-3 py-1.5">
                      {row[header]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SchoolImportWizard({
  years,
  sections,
}: {
  years: Array<{ id: string; name: string; is_current: boolean }>;
  sections: Array<{ id: string; label: string }>;
}) {
  const [studentState, studentAction, studentPending] = useActionState(
    importSchoolStudents,
    INITIAL_SCHOOL_IMPORT_STATE
  );
  const [staffState, staffAction, staffPending] = useActionState(importSchoolStaff, INITIAL_SCHOOL_IMPORT_STATE);
  const [studentCsv, setStudentCsv] = useState('');
  const [staffCsv, setStaffCsv] = useState('');
  const currentYear = years.find((year) => year.is_current) || years[0];

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Import students</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => downloadCsv('students-template.csv', STUDENT_TEMPLATE)}
          >
            <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
            Template
          </Button>
        </CardHeader>
        <CardContent>
          <form action={studentAction} className="space-y-3">
            <select name="academic_year_id" className={selectClass} defaultValue={currentYear?.id || ''} required>
              <option value="">Academic year</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                  {year.is_current ? ' (current)' : ''}
                </option>
              ))}
            </select>
            <select name="section_id" className={selectClass} defaultValue="">
              <option value="">Default section (or use a `section` column)</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
            <CsvField value={studentCsv} onChange={setStudentCsv} />
            <p className="text-muted-foreground text-[11px]">
              Required: <code>full_name</code>, <code>admission_number</code>. Students without an <code>email</code>{' '}
              get a login generated from their admission number. Guardian columns create the parent account and link it
              automatically.
            </p>
            <ImportResult state={studentState} />
            <Button type="submit" disabled={studentPending}>
              {studentPending ? 'Importing...' : 'Import students'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Import staff</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => downloadCsv('staff-template.csv', STAFF_TEMPLATE)}
          >
            <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
            Template
          </Button>
        </CardHeader>
        <CardContent>
          <form action={staffAction} className="space-y-3">
            <CsvField value={staffCsv} onChange={setStaffCsv} />
            <p className="text-muted-foreground text-[11px]">
              Required: <code>full_name</code>. <code>role</code> accepts teacher, staff, accountant, admissions, or
              admin (defaults to teacher).
            </p>
            <ImportResult state={staffState} />
            <Button type="submit" disabled={staffPending}>
              {staffPending ? 'Importing...' : 'Import staff'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
