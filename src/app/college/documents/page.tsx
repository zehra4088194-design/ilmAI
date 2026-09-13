import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { InstitutionDocuments } from '@/components/features/institution/InstitutionDocuments';

export default async function CollegeDocumentsPage() {
  const { user, supabase, context } = await requireCollegeContext('dashboard.read');
  if (!user) redirect('/login');
  if (!context || !['student','parent'].includes(context.membership.member_role)) redirect('/college');
  const db = supabase as any;
  const targetId = context.membership.member_role === 'student' ? user.id : (await db.from('college_guardians').select('student_id').eq('organization_id',context.organization.id).eq('guardian_id',user.id).limit(1).maybeSingle()).data?.student_id;
  if (!targetId) redirect('/college');
  const [{ data: profile }, { data: enrollment }, { data: result }] = await Promise.all([
    db.from('profiles').select('full_name').eq('id',targetId).maybeSingle(),
    db.from('college_enrollments').select('roll_number, college_sections!college_enrollments_section_id_fkey(name)').eq('organization_id',context.organization.id).eq('student_id',targetId).eq('status','active').maybeSingle(),
    db.from('college_report_cards').select('percentage,grade,gpa,class_position').eq('organization_id',context.organization.id).eq('student_id',targetId).not('published_at','is',null).order('published_at',{ascending:false}).limit(1).maybeSingle(),
  ]);
  const section = enrollment ? (Array.isArray(enrollment.college_sections) ? enrollment.college_sections[0] : enrollment.college_sections) : null;
  return <main className="mx-auto max-w-6xl p-4 sm:p-6"><InstitutionDocuments kind="college" organization={{ name:context.organization.name, logo_url:context.organization.logo_url, address:context.organization.address, phone:context.organization.phone }} student={{full_name:profile?.full_name || null}} enrollment={enrollment ? {classLabel:'',sectionLabel:section?.name || '',rollNumber:enrollment.roll_number || null} : null} latestResult={result || null}/></main>;
}
