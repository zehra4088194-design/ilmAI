import { redirect } from 'next/navigation';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { InstitutionStudentHub } from '@/components/features/institution/InstitutionStudentHub';

export const metadata = { title: 'My Institution | ilm AI' };

export default async function CollegeStudentHubPage() {
  const { user, supabase, context } = await requireCollegeContext('dashboard.read');
  if (!user) redirect('/login?redirect=%2Fcollege%2Fstudent-hub');
  if (!context || !['student', 'parent'].includes(context.membership.member_role)) redirect('/college');
  const db = supabase as any;
  let targetIds: string[] = [user.id];
  if (context.membership.member_role === 'parent') {
    const { data: guardians } = await db.from('college_guardians').select('student_id').eq('organization_id', context.organization.id).eq('guardian_id', user.id);
    targetIds = (guardians || []).map((row: any) => row.student_id).filter(Boolean);
  }
  const safeIds = targetIds.length ? targetIds : ['00000000-0000-0000-0000-000000000000'];
  const [{ data: profiles }, { data: enrollments }, { data: attendance }, { data: reportCards }, { data: invoices }, { data: timetable }, { data: assignments }, { data: announcements }, { data: events }, { data: notifications }] = await Promise.all([
    db.from('profiles').select('id,full_name,avatar_url').in('id', safeIds),
    db.from('college_enrollments').select('student_id,roll_number,section_id,college_sections!college_enrollments_section_id_fkey(name)').eq('organization_id',context.organization.id).in('student_id',safeIds).eq('status','active').order('created_at',{ascending:false}),
    db.from('college_attendance_records').select('id,student_id,attendance_date,status').eq('organization_id',context.organization.id).in('student_id',safeIds).order('attendance_date',{ascending:false}).limit(120),
    db.from('college_report_cards').select('id,student_id,percentage,gpa,grade,class_position,summary,published_at,college_exams(name)').eq('organization_id',context.organization.id).in('student_id',safeIds).not('published_at','is',null).order('published_at',{ascending:false}).limit(12),
    db.from('college_fee_invoices').select('id,student_id,voucher_number,total_amount,paid_amount,due_date,status').eq('organization_id',context.organization.id).in('student_id',safeIds).order('due_date',{ascending:false}).limit(20),
    db.from('college_timetable_slots').select('id,section_id,course_name,starts_at,ends_at,room,day_of_week').eq('organization_id',context.organization.id).order('day_of_week').order('starts_at'),
    db.from('college_assignments').select('id,section_id,title,instructions,due_at,created_at').eq('organization_id',context.organization.id).order('due_at',{ascending:true}).limit(30),
    db.from('college_announcements').select('id,title,body,priority,published_at').eq('organization_id',context.organization.id).order('published_at',{ascending:false}).limit(10),
    db.from('college_calendar_events').select('id,title,event_type,starts_at').eq('organization_id',context.organization.id).gte('starts_at',new Date().toISOString()).order('starts_at').limit(10),
    db.from('notifications').select('id,title,message,link,is_read,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(10),
  ]);
  const enrollment = (enrollments || []).find((item:any)=>item.student_id===user.id) || enrollments?.[0] || null;
  const section = enrollment ? (Array.isArray(enrollment.college_sections) ? enrollment.college_sections[0] : enrollment.college_sections) : null;
  const sectionId = enrollment?.section_id;
  const sectionTimetable = sectionId ? (timetable || []).filter((item:any)=>item.section_id===sectionId) : [];
  const sectionAssignments = sectionId ? (assignments || []).filter((item:any)=>item.section_id===sectionId) : [];
  return <main className="min-h-screen bg-background p-4 sm:p-6"><div className="mx-auto max-w-7xl"><InstitutionStudentHub kind="college" role={context.membership.member_role} organization={context.organization} profile={(profiles||[]).find((p:any)=>p.id===user.id) || profiles?.[0] || {full_name:null,avatar_url:null}} enrollment={enrollment ? {classLabel:'',sectionLabel:section?.name||'',rollNumber:enrollment.roll_number||null,academicLabel:null,campusLabel:context.campus?.name||null} : null} students={(profiles||[]).map((p:any)=>({id:p.id,full_name:p.full_name}))} attendance={attendance||[]} reportCards={reportCards||[]} invoices={invoices||[]} timetable={sectionTimetable} assignments={sectionAssignments} announcements={announcements||[]} events={events||[]} notifications={notifications||[]}/></div></main>;
}
