'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSchoolContext, hasSchoolPermission, getActiveSchoolOrganizationId } from './access';

export const REQUIRED_STUDENT_RECORD_FIELDS = [
  'b_form_number',
  'father_cnic',
  'matric_total_marks',
  'matric_obtained_marks',
  'date_of_birth',
  'gender',
  'address',
  'guardian_name',
  'guardian_phone',
] as const;

export type StudentRecordInput = {
  b_form_number?: string | null;
  father_cnic?: string | null;
  matric_total_marks?: number | null;
  matric_obtained_marks?: number | null;
  matric_year?: number | null;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  student_phone?: string | null;
  address?: string | null;
  city?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_relationship?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  previous_school?: string | null;
  nationality?: string | null;
  religion?: string | null;
  photo_url?: string | null;
  extra_details?: Record<string, unknown>;
};

function clean(value: FormDataEntryValue | null) {
  return String(value || '').trim() || null;
}

function numberOrNull(value: FormDataEntryValue | null) {
  const n = Number(value);
  return Number.isFinite(n) && String(value || '').trim() !== '' ? n : null;
}

function dateOrNull(value: FormDataEntryValue | null) {
  const text = clean(value);
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

export function studentRecordFromForm(formData: FormData): StudentRecordInput {
  return {
    b_form_number: clean(formData.get('b_form_number')),
    father_cnic: clean(formData.get('father_cnic')),
    matric_total_marks: numberOrNull(formData.get('matric_total_marks')),
    matric_obtained_marks: numberOrNull(formData.get('matric_obtained_marks')),
    matric_year: numberOrNull(formData.get('matric_year')),
    date_of_birth: dateOrNull(formData.get('date_of_birth')),
    gender: clean(formData.get('gender')),
    blood_group: clean(formData.get('blood_group')),
    student_phone: clean(formData.get('student_phone')),
    address: clean(formData.get('address')),
    city: clean(formData.get('city')),
    guardian_name: clean(formData.get('guardian_name')),
    guardian_phone: clean(formData.get('guardian_phone')),
    guardian_relationship: clean(formData.get('guardian_relationship')),
    emergency_contact_name: clean(formData.get('emergency_contact_name')),
    emergency_contact_phone: clean(formData.get('emergency_contact_phone')),
    previous_school: clean(formData.get('previous_school')),
    nationality: clean(formData.get('nationality')),
    religion: clean(formData.get('religion')),
  };
}

export function isStudentRecordComplete(record: Partial<StudentRecordInput> | null | undefined) {
  if (!record) return false;
  return Boolean(
    record.b_form_number?.trim() &&
      record.father_cnic?.trim() &&
      Number.isFinite(Number(record.matric_total_marks)) &&
      Number(record.matric_total_marks) > 0 &&
      Number.isFinite(Number(record.matric_obtained_marks)) &&
      Number(record.matric_obtained_marks) >= 0 &&
      record.date_of_birth &&
      record.gender &&
      record.address?.trim() &&
      record.guardian_name?.trim() &&
      record.guardian_phone?.trim()
  );
}

export async function saveSchoolStudentRecord(
  db: any,
  organizationId: string,
  studentId: string,
  input: StudentRecordInput
) {
  const record = {
    organization_id: organizationId,
    student_id: studentId,
    ...input,
    is_profile_complete: isStudentRecordComplete(input),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db
    .from('school_student_records')
    .upsert(record, { onConflict: 'organization_id,student_id' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getOwnSchoolStudentRecord(organizationId: string) {
  const supabase = await createClient();
  const { user } = await supabase.auth.getUser().then((x) => x.data);
  if (!user) return null;
  const { data } = await (supabase as any)
    .from('school_student_records')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('student_id', user.id)
    .maybeSingle();
  return data || null;
}

export async function updateSchoolStudentRecord(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const organizationId = await getActiveSchoolOrganizationId();
  const context = (organizationId ? await getSchoolContext(supabase, user.id, organizationId) : null) || (await getSchoolContext(supabase, user.id));
  if (!context) throw new Error('School membership could not be resolved.');

  const requestedStudentId = clean(formData.get('student_id'));
  const canManage = hasSchoolPermission(context, 'people.manage');
  const studentId = canManage && requestedStudentId ? requestedStudentId : user.id;
  if (studentId !== user.id && !canManage) throw new Error('You cannot update another student record.');

  const input = studentRecordFromForm(formData);
  await saveSchoolStudentRecord(supabase as any, context.organization.id, studentId, input);
  return { success: true, complete: isStudentRecordComplete(input) };
}
