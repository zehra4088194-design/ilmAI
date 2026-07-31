import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import {
  createAcademicYear,
  createCampus,
  createSchoolClass,
  createSection,
  createSubjectOffering,
  updateSchoolOrganization,
} from '@/lib/school-erp/actions';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolAcademicSetup } from '@/lib/school-erp/queries';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function SchoolSettingsPage() {
  const { supabase, context } = await requireSchoolContext('organization.manage');
  if (!context) redirect('/school-admin');
  const data = await getSchoolAcademicSetup(supabase, context);
  const canManageAcademics = hasSchoolPermission(context, 'academics.manage');

  return (
    <div className="space-y-6">
      <SchoolPageHeader title="Organization setup" description="Campuses, sessions, classes, sections, and subject ownership." />
      <Card>
        <CardHeader><CardTitle className="text-base">Organization profile</CardTitle></CardHeader>
        <CardContent>
          <SchoolActionForm action={updateSchoolOrganization} submitLabel="Update profile" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Input name="name" defaultValue={context.organization.name} placeholder="School name" required />
            <Input name="timezone" defaultValue={context.organization.timezone} placeholder="Asia/Karachi" required />
            <Input name="currency" defaultValue={context.organization.currency} maxLength={3} placeholder="PKR" required />
            <Input name="email" type="email" defaultValue={context.organization.email || ''} placeholder="School email" />
            <Input name="phone" defaultValue={context.organization.phone || ''} placeholder="Phone" />
            <Input name="address" defaultValue={context.organization.address || ''} placeholder="Address" />
          </SchoolActionForm>
        </CardContent>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Add campus</CardTitle></CardHeader>
          <CardContent>
            <SchoolActionForm action={createCampus} submitLabel="Add campus">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="name" placeholder="Main Campus" required />
                <Input name="code" placeholder="MAIN" required />
              </div>
              <Input name="address" placeholder="Address" />
              <Input name="phone" placeholder="Phone" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_main" /> Main campus</label>
            </SchoolActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Add academic year</CardTitle></CardHeader>
          <CardContent>
            <SchoolActionForm action={createAcademicYear} submitLabel="Add academic year">
              <Input name="name" placeholder="2026-27" required />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="starts_on" type="date" required />
                <Input name="ends_on" type="date" required />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_current" /> Set as current</label>
            </SchoolActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Add class</CardTitle></CardHeader>
          <CardContent>
            <SchoolActionForm action={createSchoolClass} submitLabel="Add class">
              <Input name="name" placeholder="Grade 9" required />
              <div className="grid gap-3 sm:grid-cols-2">
                <select name="campus_id" className={selectClass} required>
                  <option value="">Campus</option>
                  {data.campuses.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <select name="academic_year_id" className={selectClass} required>
                  <option value="">Academic year</option>
                  {data.years.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <Input name="grade_level" placeholder="GRADE_9 (optional mapping)" />
            </SchoolActionForm>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Add section</CardTitle></CardHeader>
          <CardContent>
            <SchoolActionForm action={createSection} submitLabel="Add section">
              <select name="class_id" className={selectClass} required>
                <option value="">Class</option>
                {data.classes.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input name="name" placeholder="A" required />
                <Input name="room" placeholder="Room 12" />
                <Input name="capacity" type="number" min={1} defaultValue={40} />
              </div>
              <select name="homeroom_teacher_id" className={selectClass}>
                <option value="">Homeroom teacher</option>
                {data.profiles.map((item: any) => {
                  const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                  return <option key={item.profile_id} value={item.profile_id}>{profile?.full_name}</option>;
                })}
              </select>
            </SchoolActionForm>
          </CardContent>
        </Card>
      </div>
      {canManageAcademics && (
        <Card>
          <CardHeader><CardTitle className="text-base">Subject offering</CardTitle></CardHeader>
          <CardContent>
            <SchoolActionForm action={createSubjectOffering} submitLabel="Assign subject" className="grid gap-3 md:grid-cols-5 md:items-end">
              <select name="section_id" className={selectClass} required>
                <option value="">Section</option>
                {data.sections.map((item: any) => <option key={item.id} value={item.id}>{item.school_classes?.name} - {item.name}</option>)}
              </select>
              <Input name="subject_name" placeholder="Mathematics" required />
              <select name="teacher_id" className={selectClass}>
                <option value="">Teacher</option>
                {data.profiles.map((item: any) => {
                  const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                  return <option key={item.profile_id} value={item.profile_id}>{profile?.full_name}</option>;
                })}
              </select>
              <Input name="weekly_periods" type="number" min={1} defaultValue={5} />
            </SchoolActionForm>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Current structure</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-muted-foreground border-b text-left text-xs"><tr><th className="py-2">Campus</th><th>Year</th><th>Class</th><th>Section</th><th>Room</th><th>Capacity</th></tr></thead>
            <tbody>
              {data.sections.map((section: any) => {
                const classItem = data.classes.find((item: any) => item.id === section.class_id);
                return <tr key={section.id} className="border-b last:border-0"><td className="py-2">{classItem?.school_campuses?.name || '-'}</td><td>{classItem?.school_academic_years?.name || '-'}</td><td>{classItem?.name || '-'}</td><td>{section.name}</td><td>{section.room || '-'}</td><td>{section.capacity}</td></tr>;
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
