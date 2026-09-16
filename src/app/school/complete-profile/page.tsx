import { redirect } from 'next/navigation';
import { getSchoolContext } from '@/lib/school-erp/access';
import { getOwnSchoolStudentRecord, updateSchoolStudentRecord } from '@/lib/school-erp/student-record';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default async function CompleteSchoolStudentProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const context = await getSchoolContext(supabase, user.id);
  if (!context || context.membership.member_role !== 'student') redirect('/dashboard');
  const record = await getOwnSchoolStudentRecord(context.organization.id);
  if (!record || record.is_profile_complete) redirect('/school');

  const field = (label: string, name: string, value: unknown, required = false, type = 'text') => (
    <label className="space-y-1.5"><span className="text-xs font-medium">{label}{required ? ' *' : ''}</span><Input name={name} type={type} defaultValue={value == null ? '' : String(value)} required={required} /></label>
  );

  return (
    <main className="mx-auto w-full max-w-4xl py-8">
      <Card className="border-violet-500/20 shadow-xl">
        <CardHeader>
          <CardTitle>Complete your school record</CardTitle>
          <CardDescription>Your school needs these details before your student portal can open. Information is saved to your school record.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={async (formData: FormData) => { await updateSchoolStudentRecord(formData); }} encType="multipart/form-data" className="grid gap-4 sm:grid-cols-2">
            {field('B-Form number', 'b_form_number', record.b_form_number, true)}
            {field("Father's CNIC number", 'father_cnic', record.father_cnic, true)}
            {field('Matric total marks', 'matric_total_marks', record.matric_total_marks, true, 'number')}
            {field('Matric obtained marks', 'matric_obtained_marks', record.matric_obtained_marks, true, 'number')}
            {field('Matric year', 'matric_year', record.matric_year, false, 'number')}
            {field('Date of birth', 'date_of_birth', record.date_of_birth, true, 'date')}
            {field('Gender', 'gender', record.gender, true)}
            {field('Blood group', 'blood_group', record.blood_group)}
            {field('Student phone', 'student_phone', record.student_phone)}
            {field('Address', 'address', record.address, true)}
            {field('City', 'city', record.city)}
            {field('Guardian name', 'guardian_name', record.guardian_name, true)}
            {field('Guardian phone', 'guardian_phone', record.guardian_phone, true)}
            {field('Relationship', 'guardian_relationship', record.guardian_relationship)}
            {field('Emergency contact name', 'emergency_contact_name', record.emergency_contact_name)}
            {field('Emergency contact phone', 'emergency_contact_phone', record.emergency_contact_phone)}
            {field('Previous school', 'previous_school', record.previous_school)}
            {field('Nationality', 'nationality', record.nationality)}
            {field('Religion', 'religion', record.religion)}
            <label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-medium">Student photo</span><Input name="student_photo" type="file" accept="image/*" /></label>
            <div className="sm:col-span-2"><Button type="submit">Save & open school portal</Button></div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}