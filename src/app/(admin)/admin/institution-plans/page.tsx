import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateInstitutionAiPlanConfig } from './actions';

export const metadata = { title: 'Institution Student Plans | Admin | ilm AI' };

export default async function AdminInstitutionPlansPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect('/login');
  const db = (await createAdminClient()) as any;
  const { data: configs, error } = await db
    .from('institution_ai_plan_config')
    .select('id, institution_type, plan_code, free_student_allowance, student_price_usd, is_active')
    .order('institution_type')
    .order('plan_code');
  if (error) throw new Error(error.message);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Institution student plans</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure how many student seats are included in each school/college Pro and Elite plan. Custom can use a per-student USD price after the included allowance.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {(configs || []).map((config: any) => (
          <Card key={config.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="capitalize">{config.institution_type} · {config.plan_code}</span>
                <span className="text-xs font-normal text-muted-foreground">{config.is_active ? 'Active' : 'Disabled'}</span>
              </CardTitle>
              <CardDescription>
                {config.plan_code === 'CUSTOM'
                  ? 'Extra students use the configured per-student price after the included allowance.'
                  : 'When the included allowance is reached, the principal must change/upgrade the student plan.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateInstitutionAiPlanConfig} className="space-y-4">
                <input type="hidden" name="id" value={config.id} />
                <input type="hidden" name="institution_type" value={config.institution_type} />
                <input type="hidden" name="plan_code" value={config.plan_code} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Free student allowance</span>
                    <Input name="free_student_allowance" type="number" min={0} step={1} defaultValue={config.free_student_allowance} required />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium">Custom price ($ / student)</span>
                    <Input name="student_price_usd" type="number" min={0} step="0.01" defaultValue={Number(config.student_price_usd || 0)} disabled={config.plan_code !== 'CUSTOM'} required={config.plan_code === 'CUSTOM'} />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="is_active" defaultChecked={Boolean(config.is_active)} />
                  Plan available to principals
                </label>
                <Button type="submit">Save {config.institution_type} {config.plan_code}</Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
