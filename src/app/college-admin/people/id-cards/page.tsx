import { redirect } from 'next/navigation';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeIdCardRoster } from '@/lib/college-erp/queries';
import { StudentIdCardGenerator } from '@/components/features/id-cards/StudentIdCardGenerator';

export default async function CollegeIdCardsPage() {
  const { supabase, context } = await requireCollegeContext('people.read', 'people');
  if (!context) redirect('/college-admin');
  const { sections, students } = await getCollegeIdCardRoster(supabase, context);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Student ID cards</h1>
        <p className="text-muted-foreground mt-1 text-sm">Pick a class/section or search a student, tick who needs a card, and print or save as PDF.</p>
      </div>
      <StudentIdCardGenerator
        students={students}
        sections={sections}
        branding={{
          orgName: context.organization.name,
          orgLogoUrl: context.organization.logo_url,
          orgAddress: context.organization.address,
          idLabel: 'Registration No.',
          principalName: context.organization.principal_name,
          principalSignatureUrl: context.organization.principal_signature_url,
        }}
      />
    </div>
  );
}
