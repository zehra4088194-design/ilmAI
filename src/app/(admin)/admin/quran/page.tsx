import { createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { QuranActionForm } from '@/components/features/quran/QuranActionForm';
import {
  addQuranTeacher,
  setQuranTeacherStatus,
  createQuranGroup,
  setQuranGroupStatus,
  addStudentToQuranGroup,
  removeStudentFromQuranGroup,
} from '@/lib/quran/admin-actions';
import { isLiveKitConfigured } from '@/lib/quran/livekit';

export const metadata = { title: 'Quran Class | Admin | ilm AI' };

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default async function AdminQuranPage() {
  const db = (await createAdminClient()) as any;

  const { data: teacherRows } = await db
    .from('quran_teachers')
    .select('id, status, bio, profiles(full_name, email)')
    .order('created_at', { ascending: false });
  const teachers = teacherRows || [];

  const { data: groupRows } = await db
    .from('quran_groups')
    .select(
      'id, name, session_time, days_of_week, status, max_students, livekit_room_name, teacher_id, quran_teachers(profiles(full_name)), quran_group_members(id, status, student_id, profiles(full_name, email))'
    )
    .order('session_time');
  const groups = groupRows || [];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-bold">Quran Class</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Live morning Quran recitation groups — teacher video, students join by voice only.
        </p>
        {!isLiveKitConfigured() && (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            Live calling is not configured yet — set LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET on the server.
            Teachers and groups can still be set up now; calls won&apos;t connect until those are set.
          </p>
        )}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Teachers</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add teacher</CardTitle>
          </CardHeader>
          <CardContent>
            <QuranActionForm action={addQuranTeacher} submitLabel="Add teacher" className="grid gap-3 md:grid-cols-3">
              <Input name="email" type="email" placeholder="Teacher's email" required className="md:col-span-2" />
              <Input name="bio" placeholder="Short bio (optional)" />
            </QuranActionForm>
          </CardContent>
        </Card>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {teachers.map((teacher: any) => {
            const profile = Array.isArray(teacher.profiles) ? teacher.profiles[0] : teacher.profiles;
            return (
              <Card key={teacher.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{profile?.full_name || profile?.email || 'Unknown'}</p>
                    <span className={`h-2.5 w-2.5 rounded-full ${teacher.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                  </div>
                  <p className="text-muted-foreground truncate text-xs">{profile?.email}</p>
                  {teacher.bio && <p className="text-muted-foreground text-xs">{teacher.bio}</p>}
                  <QuranActionForm action={setQuranTeacherStatus} submitLabel="Update" className="flex items-center gap-2">
                    <input type="hidden" name="teacher_id" value={teacher.id} />
                    <select name="status" className={selectClass} defaultValue={teacher.status}>
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </QuranActionForm>
                </CardContent>
              </Card>
            );
          })}
          {teachers.length === 0 && <p className="text-muted-foreground text-sm">No teachers added yet.</p>}
        </div>
      </section>

      <section className="space-y-4 border-t pt-8">
        <h2 className="text-lg font-bold">Groups</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create group</CardTitle>
          </CardHeader>
          <CardContent>
            <QuranActionForm action={createQuranGroup} submitLabel="Create group" className="space-y-3">
              <div className="grid gap-3 md:grid-cols-4">
                <Input name="name" placeholder="Group name (e.g. Group A)" required className="md:col-span-2" />
                <select name="teacher_id" className={selectClass} required defaultValue="">
                  <option value="" disabled>
                    Select teacher
                  </option>
                  {teachers
                    .filter((teacher: any) => teacher.status === 'active')
                    .map((teacher: any) => {
                      const profile = Array.isArray(teacher.profiles) ? teacher.profiles[0] : teacher.profiles;
                      return (
                        <option key={teacher.id} value={teacher.id}>
                          {profile?.full_name || profile?.email}
                        </option>
                      );
                    })}
                </select>
                <Input name="session_time" type="time" required defaultValue="06:30" />
              </div>
              <div className="flex flex-wrap gap-3">
                {DAY_LABELS.map((label, index) => (
                  <label key={label} className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" name="days_of_week" value={index + 1} defaultChecked className="h-3.5 w-3.5 rounded" />
                    {label}
                  </label>
                ))}
              </div>
              <Input name="max_students" type="number" min={1} defaultValue={15} placeholder="Max students" className="max-w-40" />
            </QuranActionForm>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {groups.map((group: any) => {
            const teacher = Array.isArray(group.quran_teachers) ? group.quran_teachers[0] : group.quran_teachers;
            const teacherProfile = teacher ? (Array.isArray(teacher.profiles) ? teacher.profiles[0] : teacher.profiles) : null;
            const members = (group.quran_group_members || []).filter((member: any) => member.status === 'active');
            return (
              <Card key={group.id}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{group.name}</h3>
                      <p className="text-muted-foreground text-xs">
                        {teacherProfile?.full_name || 'Unassigned'} - {group.session_time} -{' '}
                        {(group.days_of_week || []).map((day: number) => DAY_LABELS[day - 1]).join(', ')}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {members.length}/{group.max_students} students - room: {group.livekit_room_name}
                      </p>
                    </div>
                    <QuranActionForm action={setQuranGroupStatus} submitLabel="Update" className="flex items-center gap-2">
                      <input type="hidden" name="group_id" value={group.id} />
                      <select name="status" className={selectClass} defaultValue={group.status}>
                        <option value="active">active</option>
                        <option value="paused">paused</option>
                        <option value="archived">archived</option>
                      </select>
                    </QuranActionForm>
                  </div>

                  <div className="border-border rounded-lg border p-3">
                    <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">Students</p>
                    <ul className="mb-3 space-y-1.5">
                      {members.map((member: any) => {
                        const memberProfile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
                        return (
                          <li key={member.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate">{memberProfile?.full_name || memberProfile?.email}</span>
                            <QuranActionForm action={removeStudentFromQuranGroup} submitLabel="Remove" className="shrink-0">
                              <input type="hidden" name="member_id" value={member.id} />
                            </QuranActionForm>
                          </li>
                        );
                      })}
                      {members.length === 0 && <li className="text-muted-foreground text-xs">No students yet.</li>}
                    </ul>
                    <QuranActionForm action={addStudentToQuranGroup} submitLabel="Add student" className="flex gap-2">
                      <input type="hidden" name="group_id" value={group.id} />
                      <Input name="email" type="email" placeholder="Student's email" required className="flex-1" />
                    </QuranActionForm>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {groups.length === 0 && <p className="text-muted-foreground text-sm">No groups created yet.</p>}
        </div>
      </section>
    </div>
  );
}
