import { GraduationCap } from 'lucide-react';
import { notFound } from 'next/navigation';
import { PublicAdmissionForm } from '@/components/features/college-erp/PublicAdmissionForm';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function PublicCollegeAdmissionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = (await createAdminClient()) as any;
  const { data: organization } = await db
    .from('college_organizations')
    .select('id, name, address, email, phone')
    .eq('slug', slug)
    .in('status', ['active', 'trial'])
    .maybeSingle();
  if (!organization) notFound();

  const [{ data: campuses }, { data: academicYears }, { data: departments }] = await Promise.all([
    db.from('college_campuses').select('id, name').eq('organization_id', organization.id).eq('is_active', true).order('name'),
    db.from('college_academic_years').select('id, name').eq('organization_id', organization.id).in('status', ['planning', 'active']).order('starts_on', { ascending: false }),
    db.from('college_academic_departments').select('name').eq('organization_id', organization.id).eq('is_active', true).order('name'),
  ]);
  const programNames: string[] = Array.from(
    new Set<string>((departments || []).map((item: any) => String(item.name))),
  );

  return (
    <main className="bg-muted/20 min-h-screen">
      <div className="border-border bg-card border-b">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 sm:px-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white"><GraduationCap className="h-5 w-5" /></span>
          <div className="min-w-0"><h1 className="truncate font-bold">{organization.name}</h1><p className="text-muted-foreground text-xs">Online admissions</p></div>
        </div>
      </div>
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-10">
        <header><h2 className="text-2xl font-bold">Admission application</h2><p className="text-muted-foreground mt-1 text-sm">Submit applicant and guardian details. The admissions office will contact you after review.</p></header>
        <PublicAdmissionForm
          organizationId={organization.id}
          campuses={campuses || []}
          academicYears={academicYears || []}
          programs={programNames.length ? programNames : ['Intermediate (Pre-Medical)', 'Intermediate (Pre-Engineering)', 'Intermediate (Commerce)', 'Intermediate (Arts)', 'BS', 'BA', 'BSc', 'BCom', 'MA', 'MSc']}
        />
        <p className="text-muted-foreground text-xs">{[organization.address, organization.phone, organization.email].filter(Boolean).join(' | ')}</p>
      </div>
    </main>
  );
}
