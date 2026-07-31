import { createAdminClient } from '@/lib/supabase/server';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createSchoolOrganization } from './actions';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function AdminSchoolsPage() {
  const db = (await createAdminClient()) as any;
  const { data } = await db
    .from('school_organizations')
    .select('*, school_campuses(id), school_memberships(id, member_role, profiles(full_name, email))')
    .order('created_at', { ascending: false });
  const schools = data || [];

  return (
    <div className="space-y-6">
      <SchoolPageHeader title="Schools & academies" description="Create tenants, bootstrap the owner, and monitor multi-campus organizations." />
      <Card>
        <CardHeader><CardTitle className="text-base">Create organization</CardTitle></CardHeader>
        <CardContent>
          <SchoolActionForm action={createSchoolOrganization} submitLabel="Create school" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input name="name" placeholder="School name" required />
            <Input name="slug" placeholder="Public slug (optional)" />
            <select name="organization_type" className={selectClass}><option value="school">School</option><option value="academy">Academy</option><option value="college">College</option></select>
            <Input name="owner_email" type="email" placeholder="Registered owner email" required />
            <Input name="campus_name" placeholder="Main Campus" />
            <Input name="email" type="email" placeholder="School email" />
            <Input name="phone" placeholder="School phone" />
            <Input name="address" placeholder="Address" />
          </SchoolActionForm>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {schools.map((school: any) => {
          const ownerLink = (school.school_memberships || []).find((item: any) => item.member_role === 'owner');
          const owner = Array.isArray(ownerLink?.profiles) ? ownerLink.profiles[0] : ownerLink?.profiles;
          return (
            <Card key={school.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{school.name}</h2><p className="text-muted-foreground mt-1 text-xs">/{school.slug} - {school.organization_type}</p></div><span className={`h-2.5 w-2.5 rounded-full ${school.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} /></div>
                <div className="text-muted-foreground mt-4 grid grid-cols-2 gap-2 text-xs"><span>{school.school_campuses?.length || 0} campuses</span><span>{school.school_memberships?.length || 0} memberships</span></div>
                <p className="text-muted-foreground mt-3 truncate text-xs">Owner: {owner?.full_name || owner?.email || 'Not assigned'}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
