import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ExternalLink } from 'lucide-react';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function CollegeInstitutionLibraryPage() {
  const { user, supabase, context } = await requireCollegeContext('dashboard.read');
  if (!user) redirect('/login');
  if (!context || !['student','parent'].includes(context.membership.member_role)) redirect('/college');
  const { data } = await (supabase as any).from('college_resources').select('id,title,resource_type,course_name,semester,degree_name,file_url,light_file_url,dark_file_url,created_at').eq('college_id',context.organization.id).order('created_at',{ascending:false}).limit(100);
  return <main id="library" className="mx-auto max-w-6xl p-4 sm:p-6"><div className="mb-5"><p className="text-sm font-semibold text-violet-500">{context.organization.name} · ilm AI</p><h1 className="text-3xl font-black">My Institution Library</h1><p className="text-muted-foreground mt-1 text-sm">Course notes, books, lectures and past-paper material uploaded by your college.</p></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{(data||[]).map((item:any)=><Card key={item.id}><CardHeader><CardTitle className="flex items-start gap-2 text-base"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />{item.title}</CardTitle></CardHeader><CardContent><p className="text-muted-foreground line-clamp-3 text-sm">{[item.course_name,item.semester,item.degree_name,item.resource_type].filter(Boolean).join(' · ') || 'College resource'}</p>{(item.file_url||item.light_file_url||item.dark_file_url)&&<Link href={item.file_url||item.light_file_url||item.dark_file_url} target="_blank" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Open resource <ExternalLink className="h-3.5 w-3.5" /></Link>}</CardContent></Card>)}{(!data||data.length===0)&&<Card className="md:col-span-2 lg:col-span-3"><CardContent className="text-muted-foreground p-8 text-center text-sm">Your college has not published any resources here yet.</CardContent></Card>}</div></main>;
}
