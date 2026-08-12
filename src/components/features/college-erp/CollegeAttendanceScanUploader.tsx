'use client';

import { useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, Loader2, ScanLine, UserPlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { saveCollegeAttendance, requestNewCollegeStudentAddition } from '@/lib/college-erp/actions';

// Mirrors src/components/features/school-erp/AttendanceScanUploader.tsx, pointed at college
// actions/route.
type ScannedRow = {
  extractedName: string;
  extractedRollNumber: string | null;
  status: 'present' | 'absent' | 'late';
  confidence: number;
  matchedStudentId: string | null;
  matchedName: string | null;
  isNewStudent: boolean;
};

const STATUS_OPTIONS: Array<{ value: ScannedRow['status']; label: string }> = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
];

export function CollegeAttendanceScanUploader({
  sections,
  date,
}: {
  sections: Array<{ id: string; name: string; college_semesters?: { name: string } | { name: string }[] | null }>;
  date: string;
}) {
  const [sectionId, setSectionId] = useState(String(sections[0]?.id || ''));
  const [scanning, setScanning] = useState(false);
  const [rows, setRows] = useState<ScannedRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [reportedNames, setReportedNames] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file || !sectionId) return;
    setScanning(true);
    setError(null);
    setRows(null);
    setConfirmMessage(null);
    setReportedNames(new Set());
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('section_id', sectionId);
      const response = await fetch('/api/college-admin/attendance/scan', { method: 'POST', body: form });
      const json = await response.json();
      if (!response.ok || json.status === 'error') throw new Error(json.error || 'The register could not be scanned.');
      setRows(json.data.rows);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'The register could not be scanned.');
    } finally {
      setScanning(false);
    }
  };

  const setRowStatus = (index: number, status: ScannedRow['status']) => {
    setRows((current) => current?.map((row, i) => (i === index ? { ...row, status } : row)) || null);
  };

  const reportNewStudent = async (row: ScannedRow) => {
    const form = new FormData();
    form.append('section_id', sectionId);
    form.append('extracted_name', row.extractedName);
    if (row.extractedRollNumber) form.append('extracted_roll_number', row.extractedRollNumber);
    await requestNewCollegeStudentAddition({ success: false, message: '' }, form);
    setReportedNames((current) => new Set(current).add(row.extractedName));
  };

  const confirmAttendance = async () => {
    if (!rows) return;
    const entries = rows.filter((row) => row.matchedStudentId).map((row) => ({ studentId: row.matchedStudentId, status: row.status }));
    if (!entries.length) {
      setConfirmMessage('No matched students to save yet — resolve the new-student rows below first, or upload a clearer photo.');
      return;
    }
    setConfirming(true);
    setConfirmMessage(null);
    try {
      const form = new FormData();
      form.append('section_id', sectionId);
      form.append('attendance_date', date);
      form.append('entries', JSON.stringify(entries));
      const result = await saveCollegeAttendance({ success: false, message: '' }, form);
      setConfirmMessage(result.message);
      if (result.success) setRows(null);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={sectionId} onChange={(event) => setSectionId(event.target.value)} className="border-input bg-background h-10 rounded-lg border px-3 text-sm">
          {sections.map((section) => {
            const semester = Array.isArray(section.college_semesters) ? section.college_semesters[0] : section.college_semesters;
            return (
              <option key={section.id} value={section.id}>
                {semester?.name ? `${semester.name} - ` : ''}
                {section.name}
              </option>
            );
          })}
        </select>
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={scanning}>
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {scanning ? 'Reading register...' : 'Scan register photo'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            void handleFile(file);
          }}
        />
      </div>

      {error && (
        <p className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg p-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="border-border overflow-hidden rounded-lg border">
          <div className="bg-muted/50 flex items-center gap-2 px-3 py-2 text-xs font-semibold">
            <ScanLine className="h-3.5 w-3.5" />
            Review before saving — low-confidence rows are flagged
          </div>
          <div className="divide-border divide-y">
            {rows.map((row, index) => (
              <div key={`${row.extractedName}-${index}`} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{row.matchedName || row.extractedName}</p>
                    {row.confidence < 0.6 && <Badge variant="outline" className="border-amber-500 text-amber-600">Low confidence</Badge>}
                    {row.isNewStudent && <Badge variant="destructive">Not enrolled</Badge>}
                  </div>
                  {row.extractedRollNumber && <p className="text-muted-foreground text-xs">Roll {row.extractedRollNumber}</p>}
                </div>
                {row.isNewStudent ? (
                  reportedNames.has(row.extractedName) ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Reported to principal
                    </span>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => reportNewStudent(row)}>
                      <UserPlus2 className="h-3.5 w-3.5" />
                      New student detected — add to class?
                    </Button>
                  )
                ) : (
                  <div className="flex gap-1">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRowStatus(index, option.value)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
                          row.status === option.value ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t p-3">
            <Button type="button" onClick={confirmAttendance} disabled={confirming}>
              {confirming ? 'Saving...' : 'Confirm / verify'}
            </Button>
            {confirmMessage && <span className="text-muted-foreground text-xs">{confirmMessage}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
