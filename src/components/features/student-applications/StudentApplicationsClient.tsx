'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, Loader2, Send, Sparkles, UserRound, Users, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export type StudentApplicationContext = {
  institutions: Array<{
    id: string;
    type: 'school' | 'college';
    name: string;
    enrollmentId: string;
    className: string;
    sectionName: string;
    principalId: string | null;
    classInchargeId: string | null;
    principalName: string | null;
    classInchargeName: string | null;
    guardianIds: string[];
    subjects: string[];
  }>;
  applications: Array<{
    id: string;
    institution_type: string;
    institution_id: string;
    recipient_type: string;
    application_type: string;
    subject: string;
    body: string;
    starts_on: string | null;
    ends_on: string | null;
    status: string;
    response_note: string | null;
    created_at: string;
  }>;
  templates: Array<{
    id: string;
    institution_type: string;
    institution_id: string | null;
    application_type: string;
    title: string;
    subject: string;
    body: string;
  }>;
};

const TYPES = [
  ['sick_leave', 'Sick leave'],
  ['leave', 'Leave application'],
  ['fee_request', 'Fee / payment request'],
  ['document_request', 'Document request'],
  ['general', 'General application'],
] as const;

function labelStatus(status: string) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StudentApplicationsClient({ initial }: { initial: StudentApplicationContext }) {
  const [data, setData] = useState(initial);
  const [institutionIndex, setInstitutionIndex] = useState(0);
  const [recipientType, setRecipientType] = useState<'principal' | 'class_incharge'>('class_incharge');
  const [applicationType, setApplicationType] = useState('sick_leave');
  const [subject, setSubject] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [body, setBody] = useState('');
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [message, setMessage] = useState('');

  const institution = data.institutions[institutionIndex] ?? null;
  const hasTemplate = useMemo(
    () => data.templates.find((template) => template.institution_id === institution?.id && template.application_type === applicationType && template.subject === subject),
    [data.templates, institution?.id, applicationType, subject]
  );

  useEffect(() => {
    if (!institution) return;
    if (recipientType === 'class_incharge' && !institution.classInchargeId) setRecipientType('principal');
    if (!subject && institution.subjects[0]) setSubject(institution.subjects[0]);
  }, [institution, recipientType, subject]);

  const refresh = async () => {
    const res = await fetch('/api/student-applications');
    if (res.ok) setData(await res.json());
  };

  const generateDraft = async () => {
    setMessage('');
    if (!subject) return setMessage('Pehle subject select karo.');
    setDrafting(true);
    try {
      const res = await fetch('/api/student-applications/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationType, subject, startsOn, endsOn, extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'AI draft nahi ban saka.');
      setBody(json.text || '');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'AI draft nahi ban saka.');
    } finally {
      setDrafting(false);
    }
  };

  const useTemplate = () => {
    if (hasTemplate) setBody(hasTemplate.body);
  };

  const saveTemplate = async () => {
    setMessage('');
    if (!institution || !subject || !body.trim()) return setMessage('Subject aur application text zaroori hai.');
    const title = `${subject} - ${TYPES.find(([value]) => value === applicationType)?.[1] || 'Application'}`;
    const res = await fetch('/api/student-applications/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institutionType: institution.type, institutionId: institution.id, applicationType, title, subject, body }),
    });
    const json = await res.json();
    if (!res.ok) return setMessage(json.error || 'Template save nahi hua.');
    setData((current) => ({ ...current, templates: [json.template, ...current.templates] }));
    setMessage('Template save ho gaya.');
  };

  const submit = async () => {
    setMessage('');
    if (!institution) return setMessage('Koi institution connection nahi mila.');
    if (!body.trim()) return setMessage('Application text likho ya AI se draft karwao.');
    setBusy(true);
    try {
      const res = await fetch('/api/student-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionType: institution.type,
          institutionId: institution.id,
          enrollmentId: institution.enrollmentId,
          recipientType,
          applicationType,
          subject,
          body,
          startsOn,
          endsOn,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Application send nahi hui.');
      setBody('');
      setExtra('');
      setMessage('Application submit ho gayi. Recipient aur linked guardian ko notification chali gayi hai.');
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Application send nahi hui.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {data.institutions.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Tumhara koi active school/college connection nahi mila.</CardContent></Card>
      ) : (
        <>
          <Card className="border-violet-500/20 bg-violet-500/5">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> New application</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm"><span className="text-muted-foreground">Institution</span>
                  <select className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm" value={institutionIndex} onChange={(e) => { setInstitutionIndex(Number(e.target.value)); setSubject(''); }}>
                    {data.institutions.map((item, index) => <option key={`${item.type}:${item.id}:${item.enrollmentId}`} value={index}>{item.name} — {item.className} {item.sectionName}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm"><span className="text-muted-foreground">Application type</span>
                  <select className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm" value={applicationType} onChange={(e) => setApplicationType(e.target.value)}>
                    {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm"><span className="text-muted-foreground">Send to</span>
                  <select className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm" value={recipientType} onChange={(e) => setRecipientType(e.target.value as 'principal' | 'class_incharge')}>
                    {institution?.classInchargeId && <option value="class_incharge">Class incharge{institution.classInchargeName ? ` — ${institution.classInchargeName}` : ''}</option>}
                    {institution?.principalId && <option value="principal">Principal{institution.principalName ? ` — ${institution.principalName}` : ''}</option>}
                  </select>
                </label>
                <label className="space-y-1 text-sm"><span className="text-muted-foreground">Subject</span>
                  <select className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm" value={subject} onChange={(e) => setSubject(e.target.value)}>
                    <option value="">Select subject</option>
                    {institution?.subjects.map((item) => <option key={item} value={item}>{item}</option>)}
                    <option value="Other">Other / custom</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} placeholder="From date" />
                <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} placeholder="To date" />
              </div>

              <div className="rounded-xl border p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold"><WandSparkles className="h-4 w-4" /> Application writer</div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={generateDraft} disabled={drafting || !subject}>
                      {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI se likhwao
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={useTemplate} disabled={!hasTemplate}>
                      Template use karo
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={saveTemplate} disabled={!body.trim()}>
                      Save as template
                    </Button>
                  </div>
                </div>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-56" placeholder="Application yahan manually likho, ya AI se draft karwa ke edit karo..." />
                <Textarea value={extra} onChange={(e) => setExtra(e.target.value)} className="mt-3 min-h-20" placeholder="Optional details for AI draft: reason, important note, etc." />
              </div>

              {message && <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-sm">{message}</div>}
              <Button type="button" onClick={submit} disabled={busy || !body.trim()} className="w-full sm:w-auto">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit application
              </Button>
              <p className="text-muted-foreground flex items-center gap-2 text-xs"><Users className="h-3.5 w-3.5" /> Linked guardian ko bhi copy/notification milegi.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>My applications</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.applications.length === 0 ? <p className="text-muted-foreground text-sm">Abhi koi application nahi.</p> : data.applications.map((item) => (
                <div key={item.id} className="border-border rounded-xl border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div><p className="font-semibold">{item.subject}</p><p className="text-muted-foreground text-xs">{labelStatus(item.application_type)} · {item.recipient_type === 'class_incharge' ? 'Class incharge' : 'Principal'}</p></div>
                    <span className="rounded-full border px-2.5 py-1 text-xs">{labelStatus(item.status)}</span>
                  </div>
                  <p className="text-muted-foreground mt-3 whitespace-pre-wrap text-sm line-clamp-5">{item.body}</p>
                  {item.response_note && <div className="mt-3 rounded-lg bg-muted/30 p-3 text-sm"><b>Response:</b> {item.response_note}</div>}
                  <p className="text-muted-foreground mt-3 text-[11px]">{new Date(item.created_at).toLocaleString()}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
