import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CollegeActionForm } from '@/components/features/college-erp/CollegeActionForm';
import { PrincipalDirectoryMessenger } from '@/components/features/school-erp/PrincipalDirectoryMessenger';
import { ParentTeacherMessenger } from '@/components/features/school-erp/ParentTeacherMessenger';
import { createCollegeAnnouncement, publishCollegeAnnouncement, respondCollegeContactMessage } from '@/lib/college-erp/actions';
import { hasCollegePermission, requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeCommunication, getCollegeTeacherMessagingContacts } from '@/lib/college-erp/queries';
import { getInstitutionDirectoryMessages } from '@/lib/institution-directory/queries';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function CollegeCommunicationPage() {
  const { supabase, context } = await requireCollegeContext('communication.read', 'communication');
  if (!context) redirect('/college-admin');
  const data = await getCollegeCommunication(supabase, context);
  const canManage = hasCollegePermission(context, 'communication.manage');
  const canRespond = ['owner', 'admin', 'admissions', 'teacher', 'accountant'].includes(context.membership.member_role);
  const isPrincipal = ['owner', 'admin'].includes(context.membership.member_role);
  const directoryMessages = isPrincipal ? await getInstitutionDirectoryMessages(supabase, 'college', context.organization.id) : [];
  const isTeacher = context.membership.member_role === 'teacher';
  const messagingContacts = isTeacher ? await getCollegeTeacherMessagingContacts(supabase, context) : [];
  const deliveryCounts = data.deliveries.reduce((result: Record<string, number>, item: any) => {
    result[`${item.channel}:${item.status}`] = (result[`${item.channel}:${item.status}`] || 0) + 1;
    return result;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Communication</h1>
        <p className="text-muted-foreground mt-1 text-sm">Role-targeted alerts with in-app, email, SMS, WhatsApp, and push delivery queues.</p>
      </div>
      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create announcement</CardTitle></CardHeader>
          <CardContent>
            <CollegeActionForm action={createCollegeAnnouncement} submitLabel="Save announcement">
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
            </CollegeActionForm>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader><CardTitle className="text-base">Announcements</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.announcements.map((item: any) => <article key={item.id} className="border-border rounded-lg border p-3"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">{item.title}</h2><Badge variant={item.priority === 'urgent' ? 'destructive' : 'outline'}>{item.priority}</Badge><Badge variant="secondary">{item.published_at ? 'published' : 'draft'}</Badge></div><p className="text-muted-foreground mt-2 whitespace-pre-wrap text-sm">{item.body}</p><div className="mt-2 flex items-end justify-between gap-3"><p className="text-muted-foreground text-[11px]">{(item.audience_roles || []).join(', ')}</p>{canManage && !item.published_at && <CollegeActionForm action={publishCollegeAnnouncement} submitLabel="Publish" className=""><input type="hidden" name="id" value={item.id} /></CollegeActionForm>}</div></article>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Delivery queue</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(deliveryCounts).map(([key, count]) => <div key={key} className="border-border flex items-center justify-between border-b py-2 text-sm last:border-0"><span>{key.replace(':', ' - ')}</span><Badge variant="outline">{count}</Badge></div>)}
            {!Object.keys(deliveryCounts).length && <p className="text-muted-foreground text-sm">No deliveries queued.</p>}
          </CardContent>
        </Card>
      </div>
      {isTeacher && (
        <Card>
          <CardHeader><CardTitle className="text-base">Message a parent</CardTitle></CardHeader>
          <CardContent>
            <ParentTeacherMessenger
              contacts={messagingContacts}
              organizationId={context.organization.id}
              currentUserId={context.userId}
              contextType="college"
            />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">College inbox</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.messages.map((item: any) => {
            const sender = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
            return (
              <div key={item.id} className="border-border grid gap-3 rounded-lg border p-3 lg:grid-cols-[1fr_340px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.subject}</p><Badge variant="outline">{item.status}</Badge><Badge variant="secondary">{item.recipient_role}</Badge></div>
                  <p className="text-muted-foreground mt-1 text-xs">{sender?.full_name || sender?.email || 'Member'} - {new Date(item.created_at).toLocaleString()}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm">{item.body}</p>
                  {item.response && <div className="bg-muted/40 mt-3 rounded-lg p-3 text-sm"><p className="mb-1 text-xs font-semibold">College response</p>{item.response}</div>}
                </div>
                {canRespond && (
                  <CollegeActionForm action={respondCollegeContactMessage} submitLabel="Save response">
                    <input type="hidden" name="id" value={item.id} />
                    <Textarea name="response" defaultValue={item.response || ''} placeholder="Response" required />
                    <select name="status" defaultValue={item.status === 'closed' ? 'closed' : 'replied'} className={selectClass}><option value="replied">Replied</option><option value="closed">Closed</option></select>
                  </CollegeActionForm>
                )}
              </div>
            );
          })}
          {!data.messages.length && <p className="text-muted-foreground text-sm">No contact messages.</p>}
        </CardContent>
      </Card>
      {isPrincipal && (
        <Card>
          <CardHeader><CardTitle className="text-base">Message another school or college</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <PrincipalDirectoryMessenger />
            {directoryMessages.length > 0 && (
              <div className="border-border space-y-2 border-t pt-4">
                <p className="text-xs font-semibold">Recent directory messages</p>
                {directoryMessages.map((message) => (
                  <div key={message.id} className="border-border rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={message.direction === 'sent' ? 'outline' : 'secondary'}>{message.direction === 'sent' ? 'To' : 'From'} {message.counterpartName}</Badge>
                      <span className="text-muted-foreground text-[11px]">{new Date(message.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium">{message.subject}</p>
                    <p className="text-muted-foreground mt-1 whitespace-pre-wrap text-sm">{message.body}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
