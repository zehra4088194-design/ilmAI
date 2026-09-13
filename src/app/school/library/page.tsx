import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function SchoolInstitutionLibraryPage() {
  const { user, supabase, context } = await requireSchoolContext('dashboard.read');
  if (!user) redirect('/login');
  if (!context || !['student','parent'].includes(context.membership.member_role)) redirect('/school');
  const { data } = await (supabase as any).from('school_resources').select('id,title,description,resource_type,subject_name,file_url,light_file_url,dark_file_url,visibility,status,created_at').eq('organization_id',context.organization.id).in('status',['published','active']).in('visibility',['student','students','all','public']).order('created_at',{ascending:false}).limit(100);
  return <main id="library" className="mx-auto max-w-6xl p-4 sm:p-6"><div className="mb-5"><p className="text-sm font-semibold text-violet-500">{context.organization.name} · ilm AI</p><h1 className="text-3xl font-black">My Institution Library</h1><p className="text-muted-foreground mt-1 text-sm">Notes, books, lectures and past-paper material uploaded by your institution.</p></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{(data||[]).map((item:any)=><Card key={item.id}><CardHeader><CardTitle className="flex items-start gap-2 text-base"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />{item.title}</CardTitle></CardHeader><CardContent><p className="text-muted-foreground line-clamp-3 text-sm">{item.description || [item.subject_name,item.resource_type].filter(Boolean).join(' · ') || 'Institution resource'}</p>{(item.file_url||item.light_file_url||item.dark_file_url)&&<Link href={item.file_url||item.light_file_url||item.dark_file_url} target="_blank" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Open resource <ExternalLink className="h-3.5 w-3.5" /></Link>}</CardContent></Card>)}{(!data||data.length===0)&&<Card className="md:col-span-2 lg:col-span-3"><CardContent className="text-muted-foreground p-8 text-center text-sm">Your institution has not published any resources here yet.</CardContent></Card>}</div></main>;
}
