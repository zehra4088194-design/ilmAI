import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { InstitutionDocuments } from '@/components/features/institution/InstitutionDocuments';

export default async function SchoolDocumentsPage() {
  const { user, supabase, context } = await requireSchoolContext('dashboard.read');
  if (!user) redirect('/login');
  if (!context || !['student','parent'].includes(context.membership.member_role)) redirect('/school');
  const db = supabase as any;
  const targetId = context.membership.member_role === 'student' ? user.id : (await db.from('school_guardians').select('student_id').eq('organization_id',context.organization.id).eq('guardian_id',user.id).limit(1).maybeSingle()).data?.student_id;
  if (!targetId) redirect('/school');
  const [{ data: profile }, { data: enrollment }, { data: result }] = await Promise.all([
    db.from('profiles').select('full_name').eq('id',targetId).maybeSingle(),
    db.from('school_enrollments').select('roll_number, school_sections!school_enrollments_section_id_fkey(name, school_classes!school_sections_class_id_fkey(name))').eq('organization_id',context.organization.id).eq('student_id',targetId).eq('status','active').maybeSingle(),
    db.from('school_report_cards').select('percentage,grade,gpa,class_position').eq('organization_id',context.organization.id).eq('student_id',targetId).not('published_at','is',null).order('published_at',{ascending:false}).limit(1).maybeSingle(),
  ]);
  const section = enrollment ? (Array.isArray(enrollment.school_sections) ? enrollment.school_sections[0] : enrollment.school_sections) : null;
  const klass = section ? (Array.isArray(section.school_classes) ? section.school_classes[0] : section.school_classes) : null;
  return <main className="mx-auto max-w-6xl p-4 sm:p-6"><InstitutionDocuments kind="school" organization={{ name:context.organization.name, logo_url:context.organization.logo_url, address:context.organization.address, phone:context.organization.phone }} student={{full_name:profile?.full_name || null}} enrollment={enrollment ? {classLabel:klass?.name || '',sectionLabel:section?.name || '',rollNumber:enrollment.roll_number || null} : null} latestResult={result || null}/></main>;
}
