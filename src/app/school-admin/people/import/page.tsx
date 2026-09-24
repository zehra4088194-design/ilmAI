import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SchoolImportWizard } from '@/components/features/school-erp/SchoolImportWizard';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolAcademicSetup } from '@/lib/school-erp/queries';

export const metadata: Metadata = { title: 'Bulk import' };

export default async function SchoolPeopleImportPage() {
  const { supabase, context } = await requireSchoolContext('people.manage', 'people');
  if (!context) redirect('/school-admin/people');
  if (!hasSchoolPermission(context, 'people.manage')) redirect('/school-admin/people');

  const setup = await getSchoolAcademicSetup(supabase, context);
  const sections = (setup.sections || []).map((section: any) => {
    const className = (Array.isArray(section.school_classes) ? section.school_classes[0] : section.school_classes)
      ?.name;
    return { id: section.id, label: className ? `${className} - ${section.name}` : section.name };
  });

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="Bulk import"
        description="Upload the student and staff lists you already have. Accounts, enrollments, and guardian links are created in one pass."
        action={
          <Link
            href="/school-admin/people"
            className="border-border hover:bg-muted inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to People
          </Link>
        }
      />

      {!setup.years?.length || !sections.length ? (
        <div className="border-border bg-card rounded-lg border p-6 text-sm">
          <p className="font-medium">Set up the academic session first.</p>
          <p className="text-muted-foreground mt-1 text-xs">
            An academic year and at least one class section must exist before students can be imported.{' '}
            <Link href="/school-admin/settings" className="underline">
              Open Organization settings
            </Link>
            .
          </p>
        </div>
      ) : (
        <SchoolImportWizard
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
