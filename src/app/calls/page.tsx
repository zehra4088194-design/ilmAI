import { redirect } from 'next/navigation';
import { PhoneCall, PhoneIncoming, PhoneOutgoing, Clock3 } from 'lucide-react';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { getCallDirectory, getCallingSettings } from '@/lib/calling/queries';
import { CallDirectoryList } from '@/components/features/calling/CallDirectoryList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function CallsPage() {
  const { supabase, context } = await requireSchoolContext('dashboard.read');
  if (!context) redirect('/dashboard');
  const settings = await getCallingSettings(supabase, 'school', context.organization.id);
  const directory = settings.enabled ? await getCallDirectory(supabase, 'school', context.organization.id, context.userId) : [];
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/school-communication/call-history`, { headers: { cookie: '' }, cache: 'no-store' }).catch(() => null);
  const history = res && res.ok ? (await res.json()).calls || [] : [];

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
