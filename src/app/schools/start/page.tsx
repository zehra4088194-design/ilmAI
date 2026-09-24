import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { createClient } from '@/lib/supabase/server';
import { getSchoolContexts, schoolAdminHomeForRole } from '@/lib/school-erp/access';
import { startSchoolTrial } from '@/lib/school-erp/onboarding-actions';

export const metadata: Metadata = {
  title: 'Start your school on ilm AI',
  description: 'Set up your school, academy, or college on ilm AI and invite your staff and students.',
};

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function StartSchoolPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fschools%2Fstart');

  // Someone who already belongs to an institution goes straight to it.
  const contexts = await getSchoolContexts(supabase, user.id);
  if (contexts.length) redirect(schoolAdminHomeForRole(contexts[0]!.membership.member_role));

  return (
    <main className="bg-muted/20 min-h-screen px-4 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Building2 className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold">Start your institution on ilm AI</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Set up admissions, attendance, exams, fees, and AI test papers. You become the owner, and you can invite
            staff and import students straight after.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Institution details</CardTitle>
          </CardHeader>
          <CardContent>
            <SchoolActionForm action={startSchoolTrial} submitLabel="Create my institution">
              <Input name="name" placeholder="Institution name" required minLength={3} />
              <select name="organization_type" className={selectClass} defaultValue="school">
                <option value="school">School</option>
                <option value="academy">Academy</option>
                <option value="college">College</option>
              </select>
              <Input name="campus_name" placeholder="Main campus name (optional)" />
              <Input name="phone" placeholder="Office phone (optional)" />
              <Input name="email" type="email" placeholder="Office email (optional)" />
              <Input name="address" placeholder="Address (optional)" />
              <p className="text-muted-foreground text-[11px]">
                Your institution starts on a trial. Student and staff limits, pricing, and which modules are enabled
                are confirmed by the ilm AI team before billing begins.
              </p>
            </SchoolActionForm>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
