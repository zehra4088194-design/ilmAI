'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useNameSearch } from '@/lib/hooks/useNameSearch';
import { PersonSearchInput } from './PersonSearchInput';
import { SchoolActionForm } from './SchoolActionForm';
import type { SchoolActionState } from '@/lib/school-erp/types';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';
const STATUSES = ['submitted', 'under_review', 'waitlisted', 'approved', 'rejected', 'enrolled', 'withdrawn'];

// Search-enabled admissions list — name-search rollout (master prompt point 15).
export function AdmissionsList({
  applications,
  canManage,
  updateAdmissionStatus,
}: {
  applications: any[];
  canManage: boolean;
  updateAdmissionStatus: (state: SchoolActionState, formData: FormData) => Promise<SchoolActionState>;
}) {
  const getSearchableText = useMemo(
    () => (item: any) => `${item.applicant_name} ${item.application_number} ${item.guardian_name}`,
    []
  );
  const { query, setQuery, filtered } = useNameSearch(applications, getSearchableText);

  return (
    <div className="space-y-4">
      <PersonSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search applicant, guardian, or application number..."
        resultCount={query ? filtered.length : undefined}
      />
      <div className="grid gap-4">
        {filtered.map((item: any) => (
          <Card key={item.id}>
            <CardContent className="grid gap-4 p-4 lg:grid-cols-[auto_1fr_240px] lg:items-center">
              {item.student_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- applicant-supplied photo, storage-hosted
                <img
                  src={item.student_photo_url}
                  alt={item.applicant_name}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="bg-muted text-muted-foreground hidden h-16 w-16 shrink-0 items-center justify-center rounded-lg text-xs lg:flex">
                  No photo
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{item.applicant_name}</h2>
                  <Badge variant={item.status === 'approved' || item.status === 'enrolled' ? 'secondary' : item.status === 'rejected' ? 'destructive' : 'outline'}>
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {item.application_number} - {item.applying_for_class} - {item.guardian_name} - {item.guardian_phone}
                </p>
                {(item.b_form_number || item.guardian_cnic) && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {item.b_form_number && `B-Form: ${item.b_form_number}`}
                    {item.b_form_number && item.guardian_cnic && ' · '}
                    {item.guardian_cnic && `Guardian CNIC: ${item.guardian_cnic}`}
                  </p>
                )}
                <p className="text-muted-foreground mt-2 text-xs">
                  {(item.school_admission_documents || []).length} documents - Submitted {new Date(item.submitted_at).toLocaleDateString()}
                </p>
                {(item.school_admission_documents || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.school_admission_documents.map((document: any) => (
                      <Link
                        key={document.id}
                        href={`/api/school-admin/admission-document?id=${encodeURIComponent(document.id)}`}
                        target="_blank"
                        className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {document.file_name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              {canManage && (
                <SchoolActionForm action={updateAdmissionStatus} submitLabel="Update" className="flex items-end gap-2">
                  <input type="hidden" name="id" value={item.id} />
                  <select name="status" defaultValue={item.status} className={selectClass}>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </SchoolActionForm>
              )}
            </CardContent>
          </Card>
        ))}
        {!filtered.length && (
          <Card>
            <CardContent className="text-muted-foreground p-8 text-center text-sm">
              {applications.length ? 'No applications match that search.' : 'No admission applications yet.'}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
