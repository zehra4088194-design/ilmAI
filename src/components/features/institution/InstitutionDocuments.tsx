'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Printer } from 'lucide-react';

export function InstitutionDocuments({ kind, organization, student, enrollment, latestResult }: {
  kind: 'school' | 'college';
  organization: { name: string; logo_url: string | null; address?: string | null; phone?: string | null };
  student: { full_name: string | null };
  enrollment: { classLabel: string; sectionLabel: string; rollNumber: string | null } | null;
  latestResult?: { percentage: number | null; grade: string | null; gpa: number | null; class_position: number | null } | null;
}) {
  const identity = `${student.full_name || 'Student'}${enrollment?.rollNumber ? ` — Roll ${enrollment.rollNumber}` : ''}`;
  const classLabel = [enrollment?.classLabel, enrollment?.sectionLabel].filter(Boolean).join(' • ') || 'Institution student';
  const documents = [
    ['Bonafide Certificate', `This is to certify that ${identity} is a bona fide student of ${organization.name}, currently enrolled in ${classLabel}.`],
    ['Character Certificate', `This is to certify that ${identity} has been associated with ${organization.name}. The certificate is issued on the student's request.`],
    ['Fee Certificate', `This certificate confirms the fee account associated with ${identity} at ${organization.name}. For the official payable/paid amounts, refer to the Fees section.`],
    ['Result Certificate', latestResult ? `${identity} achieved ${Number(latestResult.percentage || 0).toFixed(1)}% with grade ${latestResult.grade || '—'}${latestResult.gpa != null ? ` and GPA ${latestResult.gpa}` : ''}.` : `${identity} has no published result available yet.`],
    ['Transcript / Academic Record', `Official academic record for ${identity}. Published marks and results are available in the student's institution portal.`],
  ];
  return <div className="space-y-5 print:space-y-0">
    <div className="flex items-center justify-between print:hidden"><div><p className="text-muted-foreground text-sm">Documents</p><h1 className="text-2xl font-black">Certificates & Records</h1></div><Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / Save PDF</Button></div>
    <div className="grid gap-5 md:grid-cols-2">
      {documents.map(([title, body]) => <Card key={title} className="print:break-inside-avoid"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-violet-500" />{title}</CardTitle></CardHeader><CardContent><div className="min-h-40 rounded-xl border-2 border-dashed p-6 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">{organization.logo_url ? <img src={organization.logo_url} alt="" className="h-10 w-10 object-contain" /> : <FileText className="h-5 w-5" />}</div><p className="font-black">{organization.name}</p><p className="text-muted-foreground mt-1 text-xs">{organization.address || ''}</p><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-4 text-sm leading-6">{body}</p><div className="mt-8 grid grid-cols-2 gap-8 text-xs"><span className="border-t pt-2">Authorized Signature</span><span className="border-t pt-2">Date</span></div></div></CardContent></Card>)}
    </div>
  </div>;
}
