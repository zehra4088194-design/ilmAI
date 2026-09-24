import { createClient } from '@/lib/supabase/server';

export type StudentInstitution = {
  id: string;
  type: 'school' | 'college';
  name: string;
  enrollmentId: string;
  className: string;
  sectionName: string;
  principalId: string | null;
  classInchargeId: string | null;
  classInchargeName: string | null;
  principalName: string | null;
  guardianIds: string[];
  subjects: string[];
};

const asRows = (value: any) => (Array.isArray(value) ? value : []);

export async function getStudentApplicationContext(userId: string): Promise<StudentInstitution[]> {
  const supabase = await createClient();
  const institutions: StudentInstitution[] = [];

  const schoolEnrollmentResult = await (supabase.from('school_enrollments') as any)
    .select('id,organization_id,section_id,status')
    .eq('student_id', userId)
    .eq('status', 'active');
  if (!schoolEnrollmentResult.error) {
    const enrollments = asRows(schoolEnrollmentResult.data);
    for (const enrollment of enrollments) {
      const [organization, section] = await Promise.all([
        (supabase.from('school_organizations') as any).select('id,name').eq('id', enrollment.organization_id).maybeSingle(),
        (supabase.from('school_sections') as any).select('id,class_id,name,homeroom_teacher_id').eq('id', enrollment.section_id).maybeSingle(),
      ]);
      if (organization.error || !organization.data || section.error || !section.data) continue;
      const [klass, principal, inchargeProfile, guardians, subjects] = await Promise.all([
        (supabase.from('school_classes') as any).select('id,name').eq('id', section.data.class_id).maybeSingle(),
        (supabase.from('school_memberships') as any).select('profile_id').eq('organization_id', enrollment.organization_id).eq('member_role', 'principal').eq('status', 'active').limit(1).maybeSingle(),
        section.data.homeroom_teacher_id
          ? (supabase.from('profiles') as any).select('id,full_name').eq('id', section.data.homeroom_teacher_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        (supabase.from('school_guardians') as any).select('guardian_id').eq('organization_id', enrollment.organization_id).eq('student_id', userId).eq('receives_alerts', true),
        (supabase.from('school_subject_offerings') as any).select('subject_name').eq('organization_id', enrollment.organization_id).eq('section_id', enrollment.section_id),
      ]);
      const principalId = principal.data?.profile_id || null;
      let principalName: string | null = null;
      if (principalId) {
        const profile = await (supabase.from('profiles') as any).select('full_name').eq('id', principalId).maybeSingle();
        principalName = profile.data?.full_name || null;
      }
      institutions.push({
        id: enrollment.organization_id,
        type: 'school',
        name: organization.data.name,
        enrollmentId: enrollment.id,
        className: klass.data?.name || 'Class',
        sectionName: section.data.name,
        principalId,
        classInchargeId: section.data.homeroom_teacher_id || null,
        classInchargeName: inchargeProfile.data?.full_name || null,
        principalName,
        guardianIds: asRows(guardians.data).map((row: any) => row.guardian_id).filter(Boolean),
        subjects: [...new Set(asRows(subjects.data).map((row: any) => row.subject_name).filter(Boolean))],
      });
    }
  }

  const collegeEnrollmentResult = await (supabase.from('college_enrollments') as any)
    .select('id,organization_id,section_id,status')
    .eq('student_id', userId)
    .eq('status', 'active');
  if (!collegeEnrollmentResult.error) {
    const enrollments = asRows(collegeEnrollmentResult.data);
    for (const enrollment of enrollments) {
      const [organization, section] = await Promise.all([
        (supabase.from('college_organizations') as any).select('id,name').eq('id', enrollment.organization_id).maybeSingle(),
        (supabase.from('college_sections') as any).select('id,name,advisor_id').eq('id', enrollment.section_id).maybeSingle(),
      ]);
      if (organization.error || !organization.data || section.error || !section.data) continue;
      const [principal, inchargeProfile, guardians, subjects] = await Promise.all([
        (supabase.from('college_memberships') as any).select('profile_id').eq('organization_id', enrollment.organization_id).eq('member_role', 'principal').eq('status', 'active').limit(1).maybeSingle(),
        section.data.advisor_id
          ? (supabase.from('profiles') as any).select('id,full_name').eq('id', section.data.advisor_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        (supabase.from('college_guardians') as any).select('guardian_id').eq('organization_id', enrollment.organization_id).eq('student_id', userId).eq('receives_alerts', true),
        (supabase.from('college_course_offerings') as any).select('course_name').eq('organization_id', enrollment.organization_id).eq('section_id', enrollment.section_id),
      ]);
      const principalId = principal.data?.profile_id || null;
      let principalName: string | null = null;
      if (principalId) {
        const profile = await (supabase.from('profiles') as any).select('full_name').eq('id', principalId).maybeSingle();
        principalName = profile.data?.full_name || null;
      }
      institutions.push({
        id: enrollment.organization_id,
        type: 'college',
        name: organization.data.name,
        enrollmentId: enrollment.id,
        className: 'College',
        sectionName: section.data.name,
        principalId,
        classInchargeId: section.data.advisor_id || null,
        classInchargeName: inchargeProfile.data?.full_name || null,
        principalName,
        guardianIds: asRows(guardians.data).map((row: any) => row.guardian_id).filter(Boolean),
        subjects: [...new Set(asRows(subjects.data).map((row: any) => row.course_name).filter(Boolean))],
      });
    }
  }

  return institutions;
}

export async function getOwnStudentApplications(userId: string) {
  const supabase = await createClient();
  const result = await ((supabase as any).from('student_applications') as any)
    .select('id,institution_type,institution_id,recipient_type,recipient_id,application_type,subject,body,starts_on,ends_on,status,response_note,created_at,updated_at')
    .eq('student_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  return result.error ? [] : asRows(result.data);
}

export async function getOwnTemplates(userId: string) {
  const supabase = await createClient();
  const result = await ((supabase as any).from('student_application_templates') as any)
    .select('id,institution_type,institution_id,application_type,title,subject,body,created_at,updated_at')
    .eq('student_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  return result.error ? [] : asRows(result.data);
}
