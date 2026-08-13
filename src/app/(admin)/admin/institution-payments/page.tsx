import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listPendingInstitutionPaymentVerifications } from '@/lib/institution-payments/actions';
import { PaymentReviewRow } from '@/components/features/institution-payments/PaymentReviewRow';

export const metadata = { title: 'Institution Payments | Admin | ilm AI' };

export default async function AdminInstitutionPaymentsPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect('/login');

  const claims = await listPendingInstitutionPaymentVerifications();
  const db = (await createAdminClient()) as any;

  const schoolIds = claims.filter((claim) => claim.institution_type === 'school').map((claim) => claim.organization_id);
  const collegeIds = claims.filter((claim) => claim.institution_type === 'college').map((claim) => claim.organization_id);

  const [{ data: schools }, { data: colleges }] = await Promise.all([
    schoolIds.length
      ? db.from('school_organizations').select('id, name').in('id', schoolIds)
      : Promise.resolve({ data: [] }),
    collegeIds.length
      ? db.from('college_organizations').select('id, name').in('id', collegeIds)
      : Promise.resolve({ data: [] }),
  ]);
  const nameById = new Map<string, string>([
    ...(schools || []).map((org: any): [string, string] => [org.id, org.name]),
    ...(colleges || []).map((org: any): [string, string] => [org.id, org.name]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Institution payment verifications</h1>
        <p className="text-muted-foreground text-sm">
          Manual JazzCash/Easypaisa/Bank/Card claims from school and college owners — verifying one activates the
          institution's plan immediately (renews_on set, member grants cascaded); rejecting leaves it untouched.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending review ({claims.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {claims.length === 0 ? (
            <p className="text-muted-foreground text-sm">No pending payment claims.</p>
          ) : (
            <table className="w-full min-w-[820px] text-sm">
              <thead className="text-muted-foreground border-b text-left text-xs">
                <tr>
                  <th className="py-2 pr-3">Institution</th>
                  <th className="pr-3">Method</th>
                  <th className="pr-3">Cycle</th>
                  <th className="pr-3">Amount</th>
                  <th className="pr-3">Contact</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <PaymentReviewRow key={claim.id} claim={claim} organizationName={nameById.get(claim.organization_id) || 'Unknown'} />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
