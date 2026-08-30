'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useNameSearch } from '@/lib/hooks/useNameSearch';
import { PersonSearchInput } from '@/components/features/school-erp/PersonSearchInput';
import { CollegeActionForm } from './CollegeActionForm';
import type { CollegeActionState } from '@/lib/college-erp/types';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';
// Phase 6e: inquiry/visit_scheduled/entry_test_scheduled are the pre-application funnel stages —
// same college_admissions table/status column, just widened (see the admission-funnel migration).
const STATUSES = [
  'inquiry',
  'visit_scheduled',
  'entry_test_scheduled',
  'submitted',
  'under_review',
  'waitlisted',
  'approved',
  'rejected',
  'enrolled',
  'withdrawn',
];

// Search-enabled admissions list — name-search rollout (master prompt point 15), college mirror.
export function AdmissionsList({
  applications,
  canManage,
  updateCollegeAdmissionStatus,
  sections = [],
  years = [],
}: {
  applications: any[];
  canManage: boolean;
  updateCollegeAdmissionStatus: (state: CollegeActionState, formData: FormData) => Promise<CollegeActionState>;
  sections?: any[];
  years?: any[];
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
            <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_240px] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{item.applicant_name}</h2>
                  <Badge variant={item.status === 'approved' || item.status === 'enrolled' ? 'secondary' : item.status === 'rejected' ? 'destructive' : 'outline'}>
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {item.application_number} - {item.applying_for_program} - {item.guardian_name} - {item.guardian_phone}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">Submitted {new Date(item.submitted_at).toLocaleDateString()}</p>
              </div>
              {canManage && (
                <CollegeActionForm action={updateCollegeAdmissionStatus} submitLabel="Update" className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={item.id} />
                  <select name="status" defaultValue={item.status} className={selectClass}>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  {/* Phase 6e: only used if "enrolled" is chosen above — auto-enrolls the
                      applicant (matched by their applicant_email) into this section/year. */}
                  <select name="section_id" defaultValue="" className={selectClass} title="Only used if status is set to 'enrolled'">
                    <option value="">If enrolling: section</option>
                    {sections.map((section: any) => (
                      <option key={section.id} value={section.id}>
                        {section.college_semesters?.name ? `${section.college_semesters.name} - ` : ''}
                        {section.name}
                      </option>
                    ))}
                  </select>
                  <select name="academic_year_id" defaultValue="" className={selectClass} title="Only used if status is set to 'enrolled'">
                    <option value="">If enrolling: year</option>
                    {years.map((year: any) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                  </select>
                </CollegeActionForm>
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
