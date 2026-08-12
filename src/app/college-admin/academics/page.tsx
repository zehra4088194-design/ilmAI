import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CollegeActionForm } from '@/components/features/college-erp/CollegeActionForm';
import { createCollegeAssignment, createCollegeCalendarEvent, createCollegeLessonPlan, createCollegeTimetableSlot } from '@/lib/college-erp/actions';
import { hasCollegePermission, requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeAcademics } from '@/lib/college-erp/queries';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default async function CollegeAcademicsPage() {
  const { supabase, context } = await requireCollegeContext('academics.read', 'academics');
  if (!context) redirect('/college-admin');
  const data = await getCollegeAcademics(supabase, context);
  const canManage = hasCollegePermission(context, 'academics.manage');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Academics</h1>
        <p className="text-muted-foreground mt-1 text-sm">Assignments, timetable, lesson planning, courses, and academic calendar.</p>
      </div>
      {canManage && (
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Assign work</CardTitle></CardHeader>
            <CardContent>
              <CollegeActionForm action={createCollegeAssignment} submitLabel="Assign">
                <select name="section_id" className={selectClass} required><option value="">Section</option>{data.sections.map((item: any) => <option key={item.id} value={item.id}>{item.college_semesters?.name} - {item.name}</option>)}</select>
                <select name="course_offering_id" className={selectClass}><option value="">Course</option>{data.offerings.map((item: any) => <option key={item.id} value={item.id}>{item.course_name}</option>)}</select>
                <Input name="title" placeholder="Assignment title" required />
                <Textarea name="instructions" placeholder="Instructions" />
                <Input name="due_at" type="datetime-local" />
                <Input name="attachment_url" placeholder="Attachment URL" />
              </CollegeActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Timetable entry</CardTitle></CardHeader>
            <CardContent>
              <CollegeActionForm action={createCollegeTimetableSlot} submitLabel="Add period">
                <select name="section_id" className={selectClass} required><option value="">Section</option>{data.sections.map((item: any) => <option key={item.id} value={item.id}>{item.college_semesters?.name} - {item.name}</option>)}</select>
                <Input name="course_name" placeholder="Course" required />
                <select name="day_of_week" className={selectClass}>{DAYS.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select>
                <div className="grid grid-cols-2 gap-3"><Input name="starts_at" type="time" required /><Input name="ends_at" type="time" required /></div>
                <Input name="room" placeholder="Room" />
              </CollegeActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Lesson plan</CardTitle></CardHeader>
            <CardContent>
              <CollegeActionForm action={createCollegeLessonPlan} submitLabel="Add lesson plan">
                <select name="course_offering_id" className={selectClass} required><option value="">Course</option>{data.offerings.map((item: any) => <option key={item.id} value={item.id}>{item.course_name}</option>)}</select>
                <Input name="title" placeholder="Lesson title" required />
                <Input name="lesson_date" type="date" required />
                <Input name="objectives" placeholder="Learning objectives" />
                <Textarea name="content" placeholder="Lesson content" />
                <Input name="resources" placeholder="Resources, comma separated" />
                <select name="status" className={selectClass}><option value="draft">Draft</option><option value="ready">Ready</option><option value="delivered">Delivered</option><option value="reviewed">Reviewed</option></select>
              </CollegeActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Calendar event</CardTitle></CardHeader>
            <CardContent>
              <CollegeActionForm action={createCollegeCalendarEvent} submitLabel="Add event">
                <Input name="title" placeholder="Event title" required />
                <select name="event_type" className={selectClass}><option value="academic">Academic</option><option value="exam">Exam</option><option value="holiday">Holiday</option><option value="meeting">Meeting</option><option value="activity">Activity</option><option value="deadline">Deadline</option></select>
                <Input name="starts_at" type="datetime-local" required />
                <Input name="ends_at" type="datetime-local" />
                <Textarea name="description" placeholder="Description" />
              </CollegeActionForm>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent assignments</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.assignments.map((item: any) => <div key={item.id} className="border-border rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold">{item.title}</p><Badge variant="outline">{item.college_sections?.name || 'Section'}</Badge></div><p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{item.instructions || 'No instructions'}</p><p className="text-muted-foreground mt-2 text-[11px]">{item.due_at ? `Due ${new Date(item.due_at).toLocaleString()}` : 'No due date'}</p></div>)}
            {!data.assignments.length && <p className="text-muted-foreground text-sm">No assignments yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Lesson plans</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.lessonPlans.map((item: any) => <div key={item.id} className="border-border rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold">{item.title}</p><Badge variant="outline">{item.status}</Badge></div><p className="text-muted-foreground mt-1 text-xs">{item.college_course_offerings?.course_name || 'Course'} - {item.lesson_date}</p></div>)}
            {!data.lessonPlans.length && <p className="text-muted-foreground text-sm">No lesson plans.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Weekly timetable</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {DAYS.map((day, index) => {
              const entries = data.timetable.filter((item: any) => item.day_of_week === index + 1);
              if (!entries.length) return null;
              return <div key={day}><p className="text-muted-foreground mb-1 text-xs font-semibold">{day}</p><div className="space-y-1">{entries.map((item: any) => <div key={item.id} className="bg-muted/40 flex items-center gap-3 rounded-md px-3 py-2 text-xs"><span className="w-24 font-mono">{String(item.starts_at).slice(0, 5)}-{String(item.ends_at).slice(0, 5)}</span><span className="min-w-0 flex-1 truncate font-medium">{item.course_name}</span><span className="text-muted-foreground">{item.college_sections?.name}</span></div>)}</div></div>;
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
