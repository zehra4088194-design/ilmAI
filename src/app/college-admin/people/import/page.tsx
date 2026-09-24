import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CollegeImportWizard } from '@/components/features/college-erp/CollegeImportWizard';
import { hasCollegePermission, requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeAcademicSetup } from '@/lib/college-erp/queries';

export const metadata: Metadata = { title: 'Bulk import' };

export default async function CollegePeopleImportPage() {
  const { supabase, context } = await requireCollegeContext('people.manage', 'people');
  if (!context) redirect('/college-admin/people');
  if (!hasCollegePermission(context, 'people.manage')) redirect('/college-admin/people');

  const setup = await getCollegeAcademicSetup(supabase, context);
  const sections = (setup.sections || []).map((section: any) => {
    const semesterName = (Array.isArray(section.college_semesters) ? section.college_semesters[0] : section.college_semesters)?.name;
    return { id: section.id, label: semesterName ? `${semesterName} - ${section.name}` : section.name };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bulk import</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload the student and staff lists you already have. Accounts, enrollments, and guardian links are created in one pass.
          </p>
        </div>
        <Link
          href="/college-admin/people"
          className="border-border hover:bg-muted inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to People
        </Link>
      </div>

      {!setup.years?.length || !sections.length ? (
        <div className="border-border bg-card rounded-lg border p-6 text-sm">
          <p className="font-medium">Set up the academic session first.</p>
          <p className="text-muted-foreground mt-1 text-xs">
            An academic year and at least one class section must exist before students can be imported.{' '}
            <Link href="/college-admin/settings" className="underline">
              Open Organization settings
            </Link>
            .
          </p>
        </div>
      ) : (
        <CollegeImportWizard
          years={(setup.years || []).map((year: any) => ({
            id: year.id,
            name: year.name,
            is_current: Boolean(year.is_current),
          }))}
          sections={sections}
        />
      )}
    </div>
  );
}
