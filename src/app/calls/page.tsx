import { redirect } from 'next/navigation';
import { PhoneCall, PhoneIncoming, PhoneOutgoing, Clock3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallDirectory, getCallingSettings } from '@/lib/calling/queries';
import { CallDirectoryList } from '@/components/features/calling/CallDirectoryList';
import { CallButton } from '@/components/features/calling/CallButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function CallsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fcalls');

  const school = await requireSchoolContext('dashboard.read');
  const schoolContext = school.context;
  const collegeContext = schoolContext ? null : (await requireCollegeContext('dashboard.read')).context;
  const institutionType = schoolContext ? 'school' as const : collegeContext ? 'college' as const : 'consumer' as const;
  const organizationId = schoolContext?.organization.id || collegeContext?.organization.id || 'consumer';
  const currentRole = schoolContext?.membership.member_role || collegeContext?.membership.member_role || 'student';
  const settings = await getCallingSettings(supabase, institutionType, organizationId);
  const directory = await getCallDirectory(supabase, institutionType, organizationId, user.id);

  const admin = await createAdminClient();
  const adminDb = admin as any;
  let history: any[] = [];
  if (institutionType !== 'consumer') {
    const table = institutionType === 'school' ? 'school_call_logs' : 'college_call_logs';
    let historyQuery = adminDb
      .from(table)
      .select('id, caller_id, callee_id, status, started_at, ended_at')
      .eq('organization_id', organizationId)
      .order('started_at', { ascending: false })
      .limit(100);
    if (!['owner', 'admin'].includes(currentRole)) historyQuery = historyQuery.or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`);
    const { data: historyRows } = await historyQuery;
    const historyIds = Array.from(new Set((historyRows || []).flatMap((row: any) => [row.caller_id, row.callee_id])));
    const { data: historyProfiles } = historyIds.length
      ? await adminDb.from('profiles').select('id, full_name').in('id', historyIds)
      : { data: [] };
    const historyById = new Map((historyProfiles || []).map((p: any) => [p.id, p]));
    history = (historyRows || []).map((row: any) => ({ ...row, caller: historyById.get(row.caller_id) || null, callee: historyById.get(row.callee_id) || null }));
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 py-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Calls</h1>
        <p className="text-muted-foreground text-sm">Voice calls for ilm AI users, with institution controls when you belong to a school or college.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PhoneCall className="h-4 w-4 text-emerald-500" /> People you can call
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settings.enabled ? (
            institutionType === 'consumer' ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {directory.length ? directory.map((person) => (
                  <div key={person.profile_id} className="flex items-center gap-3 rounded-xl border p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                      {person.avatar_url ? <img src={person.avatar_url} alt={person.full_name || 'User'} className="h-full w-full object-cover" /> : <span className="text-sm font-semibold">{(person.full_name || 'U').slice(0, 1).toUpperCase()}</span>}
                    </div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{person.full_name || 'ilm AI user'}</p><p className="text-muted-foreground text-xs capitalize">{person.member_role}</p></div>
                    <CallButton institutionType="consumer" organizationId="consumer" target={{ userId: person.profile_id, name: person.full_name || 'ilm AI user', avatarUrl: person.avatar_url }} />
                  </div>
                )) : <p className="text-muted-foreground py-6 text-center text-sm">No other users are available to call.</p>}
              </div>
            ) : (
              <CallDirectoryList institutionType={institutionType} organizationId={organizationId} entries={directory} />
            )
          ) : <p className="text-muted-foreground py-4 text-sm">Voice calling is currently disabled for this institution.</p>}
        </CardContent>
      </Card>

      {institutionType !== 'consumer' && <Card>
        <CardHeader><CardTitle className="text-base">Recent calls</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {history.length ? history.map((call: any) => {
            const outgoing = call.caller_id === user.id;
            const other = outgoing ? call.callee : call.caller;
            return <div key={call.id} className="flex items-center gap-3 rounded-xl border p-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">{outgoing ? <PhoneOutgoing className="h-4 w-4" /> : <PhoneIncoming className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{other?.full_name || 'User'}</p><p className="text-muted-foreground flex items-center gap-1 text-xs"><Clock3 className="h-3 w-3" />{call.started_at ? new Date(call.started_at).toLocaleString() : 'Unknown time'}</p></div><Badge variant="outline" className="capitalize">{call.status}</Badge></div>;
          }) : <p className="text-muted-foreground py-6 text-center text-sm">No call history yet.</p>}
        </CardContent>
      </Card>}
    </main>
  );
}
