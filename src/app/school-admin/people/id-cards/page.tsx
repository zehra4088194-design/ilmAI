import { redirect } from 'next/navigation';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolIdCardRoster } from '@/lib/school-erp/queries';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { StudentIdCardGenerator } from '@/components/features/id-cards/StudentIdCardGenerator';

export default async function SchoolIdCardsPage() {
  const { supabase, context } = await requireSchoolContext('people.read', 'people');
  if (!context) redirect('/school-admin');
  const { sections, students } = await getSchoolIdCardRoster(supabase, context);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="Student ID cards"
        description="Pick a class/section or search a student, tick who needs a card, and print or save as PDF."
      />
      <StudentIdCardGenerator
        students={students}
        sections={sections}
        branding={{
          orgName: context.organization.name,
          orgLogoUrl: context.organization.logo_url,
          orgAddress: context.organization.address,
          idLabel: 'Admission No.',
          principalName: context.organization.principal_name,
          principalSignatureUrl: context.organization.principal_signature_url,
        }}
      />
    </div>
  );
}
