import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { createAnnouncement, publishAnnouncement, respondSchoolContactMessage } from '@/lib/school-erp/actions';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolCommunication } from '@/lib/school-erp/queries';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function SchoolCommunicationPage() {
  const { supabase, context } = await requireSchoolContext('communication.read');
  if (!context) redirect('/school-admin');
  const data = await getSchoolCommunication(supabase, context);
  const canManage = hasSchoolPermission(context, 'communication.manage');
  const canRespond = ['owner', 'admin', 'admissions', 'teacher', 'accountant'].includes(context.membership.member_role);
  const deliveryCounts = data.deliveries.reduce((result: Record<string, number>, item: any) => {
    result[`${item.channel}:${item.status}`] = (result[`${item.channel}:${item.status}`] || 0) + 1;
    return result;
  }, {});

  return (
    <div className="space-y-6">
      <SchoolPageHeader title="Communication" description="Role-targeted alerts with in-app, email, SMS, WhatsApp, and push delivery queues." />
      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create announcement</CardTitle></CardHeader>
          <CardContent>
            <SchoolActionForm action={createAnnouncement} submitLabel="Save announcement">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="title" placeholder="Announcement title" required />
                <select name="priority" className={selectClass}><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select>
              </div>
              <Textarea name="body" placeholder="Message" rows={5} required />
              <div>
                <p className="mb-2 text-xs font-medium">Audience</p>
                <div className="flex flex-wrap gap-3">{['student', 'parent', 'teacher', 'staff'].map((role) => <label key={role} className="flex items-center gap-1.5 text-sm capitalize"><input type="checkbox" name="audience_roles" value={role} defaultChecked />{role}</label>)}</div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium">Channels</p>
                <div className="flex flex-wrap gap-3">{['in_app', 'email', 'sms', 'whatsapp', 'push'].map((channel) => <label key={channel} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="delivery_channels" value={channel} defaultChecked={channel === 'in_app'} />{channel.replace('_', ' ')}</label>)}</div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publish_now" defaultChecked /> Publish now</label>
            </SchoolActionForm>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader><CardTitle className="text-base">Announcements</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.announcements.map((item: any) => <article key={item.id} className="border-border rounded-lg border p-3"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">{item.title}</h2><Badge variant={item.priority === 'urgent' ? 'destructive' : 'outline'}>{item.priority}</Badge><Badge variant="secondary">{item.published_at ? 'published' : 'draft'}</Badge></div><p className="text-muted-foreground mt-2 whitespace-pre-wrap text-sm">{item.body}</p><div className="mt-2 flex items-end justify-between gap-3"><p className="text-muted-foreground text-[11px]">{(item.audience_roles || []).join(', ')}</p>{canManage && !item.published_at && <SchoolActionForm action={publishAnnouncement} submitLabel="Publish" className=""><input type="hidden" name="id" value={item.id} /></SchoolActionForm>}</div></article>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Delivery queue</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(deliveryCounts).map(([key, count]) => <div key={key} className="border-border flex items-center justify-between border-b py-2 text-sm last:border-0"><span>{key.replace(':', ' - ')}</span><Badge variant="outline">{count}</Badge></div>)}
            {!Object.keys(deliveryCounts).length && <p className="text-muted-foreground text-sm">No deliveries queued.</p>}
            <p className="text-muted-foreground pt-3 text-xs">In-app alerts require no paid provider. Email, SMS, WhatsApp, and push use configured provider credentials; unavailable channels are marked skipped.</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">School inbox</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.messages.map((item: any) => {
            const sender = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
            return (
              <div key={item.id} className="border-border grid gap-3 rounded-lg border p-3 lg:grid-cols-[1fr_340px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.subject}</p><Badge variant="outline">{item.status}</Badge><Badge variant="secondary">{item.recipient_role}</Badge></div>
                  <p className="text-muted-foreground mt-1 text-xs">{sender?.full_name || sender?.email || 'Member'} - {new Date(item.created_at).toLocaleString()}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm">{item.body}</p>
                  {item.response && <div className="bg-muted/40 mt-3 rounded-lg p-3 text-sm"><p className="mb-1 text-xs font-semibold">School response</p>{item.response}</div>}
                </div>
                {canRespond && (
                  <SchoolActionForm action={respondSchoolContactMessage} submitLabel="Save response">
                    <input type="hidden" name="id" value={item.id} />
                    <Textarea name="response" defaultValue={item.response || ''} placeholder="Response" required />
                    <select name="status" defaultValue={item.status === 'closed' ? 'closed' : 'replied'} className={selectClass}><option value="replied">Replied</option><option value="closed">Closed</option></select>
                  </SchoolActionForm>
                )}
              </div>
            );
          })}
          {!data.messages.length && <p className="text-muted-foreground text-sm">No contact messages.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
