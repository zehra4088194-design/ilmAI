import { redirect } from 'next/navigation';
import { PhoneCall, PhoneIncoming, PhoneOutgoing, Clock3 } from 'lucide-react';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { createAdminClient } from '@/lib/supabase/server';
import { getCallDirectory, getCallingSettings } from '@/lib/calling/queries';
import { CallDirectoryList } from '@/components/features/calling/CallDirectoryList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function CallsPage() {
  const { supabase, context } = await requireSchoolContext('dashboard.read');
  if (!context) redirect('/dashboard');
  const settings = await getCallingSettings(supabase, 'school', context.organization.id);
  const directory = settings.enabled ? await getCallDirectory(supabase, 'school', context.organization.id, context.userId) : [];
  const admin = await createAdminClient();
  const adminDb = admin as any;
  let historyQuery = adminDb.from('school_call_logs').select('id, caller_id, callee_id, status, started_at, ended_at').eq('organization_id', context.organization.id).order('started_at', { ascending: false }).limit(100);
  if (!['owner', 'admin'].includes(context.membership.member_role)) historyQuery = historyQuery.or(`caller_id.eq.${context.userId},callee_id.eq.${context.userId}`);
  const { data: historyRows } = await historyQuery;
  const historyIds = Array.from(new Set((historyRows || []).flatMap((row: any) => [row.caller_id, row.callee_id])));
  const { data: historyProfiles } = historyIds.length ? await adminDb.from('profiles').select('id, full_name').in('id', historyIds) : { data: [] };
  const historyById = new Map((historyProfiles || []).map((p: any) => [p.id, p]));
  const history = (historyRows || []).map((row: any) => ({ ...row, caller: historyById.get(row.caller_id) || null, callee: historyById.get(row.callee_id) || null }));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 py-3">
      <div><h1 className="text-2xl font-black tracking-tight">Calls</h1><p className="text-muted-foreground text-sm">Call students, teachers, parents and school administration from one place.</p></div>
      {!settings.enabled ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Voice calling is currently disabled for this school.</CardContent></Card> : <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><PhoneCall className="h-4 w-4 text-emerald-500" /> People you can call</CardTitle></CardHeader><CardContent><CallDirectoryList institutionType="school" organizationId={context.organization.id} entries={directory} /></CardContent></Card>}
      <Card><CardHeader><CardTitle className="text-base">Recent calls</CardTitle></CardHeader><CardContent className="space-y-2">
        {history.length ? history.map((call: any) => {
          const outgoing = call.caller_id === context.userId; const other = outgoing ? call.callee : call.caller;
          return <div key={call.id} className="flex items-center gap-3 rounded-xl border p-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">{outgoing ? <PhoneOutgoing className="h-4 w-4" /> : <PhoneIncoming className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{other?.full_name || 'School member'}</p><p className="text-muted-foreground flex items-center gap-1 text-xs"><Clock3 className="h-3 w-3" />{call.started_at ? new Date(call.started_at).toLocaleString() : 'Unknown time'}</p></div><Badge variant="outline" className="capitalize">{call.status}</Badge></div>;
        }) : <p className="text-muted-foreground py-6 text-center text-sm">No call history yet.</p>}
      </CardContent></Card>
    </main>
  );
}
