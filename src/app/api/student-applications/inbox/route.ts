import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login is required.' }, { status: 401 });

  const { data, error } = await (supabase.from('student_applications') as any)
    .select('id,student_id,institution_type,institution_id,recipient_type,application_type,subject,body,starts_on,ends_on,status,response_note,created_at,updated_at')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = Array.isArray(data) ? data : [];
  const studentIds = [...new Set(rows.map((row: any) => row.student_id).filter(Boolean))];
  const profiles = studentIds.length
    ? await (supabase.from('profiles') as any).select('id,full_name,email').in('id', studentIds)
    : { data: [] };
  const profileMap = new Map((profiles.data || []).map((profile: any) => [profile.id, profile]));

  const schoolOrgIds = [...new Set(rows.filter((row: any) => row.institution_type === 'school').map((row: any) => row.institution_id))];
  const collegeOrgIds = [...new Set(rows.filter((row: any) => row.institution_type === 'college').map((row: any) => row.institution_id))];
  const [schools, colleges] = await Promise.all([
    schoolOrgIds.length ? (supabase.from('school_organizations') as any).select('id,name').in('id', schoolOrgIds) : { data: [] },
    collegeOrgIds.length ? (supabase.from('college_organizations') as any).select('id,name').in('id', collegeOrgIds) : { data: [] },
  ]);
  const institutionMap = new Map<string, string>();
  for (const row of schools.data || []) institutionMap.set(row.id, row.name);
  for (const row of colleges.data || []) institutionMap.set(row.id, row.name);

  return NextResponse.json({
    applications: rows.map((row: any) => ({
      ...row,
      studentName: profileMap.get(row.student_id)?.full_name || 'Student',
      studentEmail: profileMap.get(row.student_id)?.email || '',
      institutionName: institutionMap.get(row.institution_id) || 'Institution',
    })),
  });
}
